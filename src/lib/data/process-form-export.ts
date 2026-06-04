import { parse } from "csv-parse/sync";
import { convertGoogleFormResponsesToReviewedDraftCsv } from "./convert-form-responses";
import {
  importReviewedData,
  REVIEWED_DATA_HEADERS,
} from "./import-reviewed-data";
import type { DataSet } from "./load-data";

type ReviewedHeader = (typeof REVIEWED_DATA_HEADERS)[number];
type ReviewedRow = Record<ReviewedHeader, string>;

type FileCandidate = {
  mtimeMs: number;
  path: string;
};

export type ProcessFormExportResult = {
  blockers: string[];
  canWrite: boolean;
  draftCsv: string;
  selectedInputPath?: string;
  summary: {
    rowsConverted: number;
  };
  updatedDataSet?: DataSet;
  warnings: string[];
};

const OVERRIDE_HEADERS = [
  "address",
  "shopId",
  "shopName",
  "district",
  "borough",
  "lat",
  "lng",
  "status",
  "confidence",
  "sourceUrl",
  "notes",
  "approved",
] as const;

const REQUIRED_REVIEWED_FIELDS: ReviewedHeader[] = [
  "shopId",
  "priceRecordId",
  "address",
  "district",
  "borough",
  "lat",
  "lng",
  "status",
  "observedAt",
  "priceCents",
  "productType",
  "sourceType",
  "confidence",
];

type OverrideRow = Record<(typeof OVERRIDE_HEADERS)[number], string>;

function parseCsvRows(input: string) {
  return parse(input, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function formatReviewedRows(rows: ReviewedRow[]) {
  const body = rows.map((row) =>
    REVIEWED_DATA_HEADERS.map((header) => escapeCsvCell(row[header])).join(","),
  );

  return `${[REVIEWED_DATA_HEADERS.join(","), ...body].join("\n")}\n`;
}

export function normalizeAddressForReview(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ");
}

export function selectNewestCsv(candidates: FileCandidate[]) {
  const csvCandidates = candidates.filter((candidate) =>
    candidate.path.toLowerCase().endsWith(".csv"),
  );

  return csvCandidates.sort((left, right) => {
    const timeDiff = right.mtimeMs - left.mtimeMs;
    return timeDiff === 0 ? left.path.localeCompare(right.path) : timeDiff;
  })[0]?.path;
}

function parseReviewedRows(csvInput: string): ReviewedRow[] {
  return parseCsvRows(csvInput).map((row) => {
    const reviewedRow = {} as ReviewedRow;

    for (const header of REVIEWED_DATA_HEADERS) {
      reviewedRow[header] = row[header] ?? "";
    }

    return reviewedRow;
  });
}

function parseOverrides(overrideCsv: string | undefined) {
  const overridesByAddress = new Map<string, OverrideRow>();

  if (!overrideCsv?.trim()) {
    return overridesByAddress;
  }

  for (const row of parseCsvRows(overrideCsv)) {
    const overrideRow = {} as OverrideRow;

    for (const header of OVERRIDE_HEADERS) {
      overrideRow[header] = row[header] ?? "";
    }

    if (overrideRow.address) {
      overridesByAddress.set(
        normalizeAddressForReview(overrideRow.address),
        overrideRow,
      );
    }
  }

  return overridesByAddress;
}

function hasApprovedOverride(row: OverrideRow | undefined) {
  return /^(yes|y|true|1)$/i.test(row?.approved.trim() ?? "");
}

function slugify(value: string) {
  const transliterated = value
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function applyOverride(row: ReviewedRow, override: OverrideRow) {
  row.shopId = override.shopId || row.shopId;
  row.shopName = override.shopName || row.shopName;
  row.district = override.district || row.district;
  row.borough = override.borough || row.borough;
  row.lat = override.lat || row.lat;
  row.lng = override.lng || row.lng;
  row.status = override.status || row.status;
  row.confidence = override.confidence || row.confidence;
  row.sourceUrl = override.sourceUrl || row.sourceUrl;
  row.notes = override.notes || row.notes;
}

function buildPriceRecordId(row: ReviewedRow) {
  return slugify(
    ["price", row.shopId, row.observedAt, row.productType]
      .filter(Boolean)
      .join("-"),
  );
}

function fillExistingShop(row: ReviewedRow, dataSet: DataSet) {
  const normalizedAddress = normalizeAddressForReview(row.address);
  const existingShop = dataSet.shops.find(
    (shop) => normalizeAddressForReview(shop.address) === normalizedAddress,
  );

  if (!existingShop) {
    return false;
  }

  row.shopId = existingShop.id;
  row.shopName = existingShop.name ?? row.shopName;
  row.address = existingShop.address;
  row.district = existingShop.district;
  row.borough = existingShop.borough;
  row.lat = String(existingShop.lat);
  row.lng = String(existingShop.lng);
  row.status = existingShop.status;
  row.priceRecordId = buildPriceRecordId(row);

  return true;
}

function getMissingRequiredFields(row: ReviewedRow) {
  return REQUIRED_REVIEWED_FIELDS.filter((field) => !row[field]);
}

function collectCompletenessBlockers(rows: ReviewedRow[]) {
  const blockers: string[] = [];

  rows.forEach((row, index) => {
    const missing = getMissingRequiredFields(row);

    if (missing.length > 0) {
      blockers.push(
        `Row ${index + 1} (${row.address || "missing address"}): complete ${missing.join(", ")}.`,
      );
    }
  });

  return blockers;
}

function collectImportBlockers(dataSet: DataSet, draftCsv: string) {
  try {
    return {
      blockers: [] as string[],
      updatedDataSet: importReviewedData(dataSet, draftCsv).dataSet,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        blockers: [`Reviewed import dry run failed: ${error.message}`],
        updatedDataSet: undefined,
      };
    }

    return {
      blockers: ["Reviewed import dry run failed with an unknown error."],
      updatedDataSet: undefined,
    };
  }
}

export function processFormExportData({
  currentDataSet,
  overrideCsv,
  rawCsv,
  selectedInputPath,
}: {
  currentDataSet: DataSet;
  overrideCsv?: string;
  rawCsv: string;
  selectedInputPath?: string;
}): ProcessFormExportResult {
  const conversion = convertGoogleFormResponsesToReviewedDraftCsv(rawCsv);
  const rows = parseReviewedRows(conversion.csv);
  const overridesByAddress = parseOverrides(overrideCsv);
  const blockers: string[] = [];

  rows.forEach((row, index) => {
    const hasExistingShop = fillExistingShop(row, currentDataSet);
    const override = overridesByAddress.get(
      normalizeAddressForReview(row.address),
    );

    if (override) {
      applyOverride(row, override);
      row.priceRecordId = buildPriceRecordId(row);

      if (!hasExistingShop && !hasApprovedOverride(override)) {
        blockers.push(
          `Row ${index + 1} (${row.address}): override row must have approved=yes before automatic write.`,
        );
      }
    }
  });

  blockers.push(...collectCompletenessBlockers(rows));

  const draftCsv = formatReviewedRows(rows);

  if (blockers.length > 0) {
    return {
      blockers,
      canWrite: false,
      draftCsv,
      selectedInputPath,
      summary: conversion.summary,
      warnings: conversion.warnings,
    };
  }

  const importCheck = collectImportBlockers(currentDataSet, draftCsv);
  blockers.push(...importCheck.blockers);

  return {
    blockers,
    canWrite: blockers.length === 0,
    draftCsv,
    selectedInputPath,
    summary: conversion.summary,
    updatedDataSet:
      blockers.length === 0 ? importCheck.updatedDataSet : undefined,
    warnings: conversion.warnings,
  };
}
