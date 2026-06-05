import { parse } from "csv-parse/sync";
import {
  type PriceRecord,
  priceRecordCsvRowSchema,
  type Shop,
  shopSchema,
} from "../validation/schemas";
import { validateDataSet } from "../validation/validate-data";
import { convertGoogleFormResponsesToReviewedDraftCsv } from "./convert-form-responses";
import {
  importReviewedData,
  REVIEWED_DATA_HEADERS,
  ReviewedDataImportError,
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
  rowResults: ProcessFormExportRowResult[];
  selectedInputPath?: string;
  summary: {
    rowsConverted: number;
  };
  updatedDataSet?: DataSet;
  warnings: string[];
};

export const FORM_EXPORT_ACTIONS = [
  "",
  "append",
  "skip",
  "correct_price",
  "update_shop",
  "delete_price",
] as const;

export type FormExportAction = (typeof FORM_EXPORT_ACTIONS)[number];

export type ProcessFormExportClassification =
  | "new_shop_new_price"
  | "existing_shop_new_price"
  | "duplicate_price_record"
  | "possible_correction"
  | "shop_metadata_change"
  | "shop_status_update"
  | "skipped"
  | "price_correction"
  | "price_delete";

export type ProcessFormExportRowResult = {
  action: Exclude<FormExportAction, "">;
  address: string;
  blockers: string[];
  classification: ProcessFormExportClassification;
  priceRecordId: string;
  rowNumber: number;
  shopId: string;
  targetPriceRecordId?: string;
  targetShopId?: string;
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
  "action",
  "targetPriceRecordId",
  "targetShopId",
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

function normalizeAction(
  value: string | undefined,
): Exclude<FormExportAction, ""> {
  const normalized = value?.trim() ?? "";

  if (
    normalized === "append" ||
    normalized === "skip" ||
    normalized === "correct_price" ||
    normalized === "update_shop" ||
    normalized === "delete_price"
  ) {
    return normalized;
  }

  return "append";
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

function getMissingRequiredFieldsBlocker({
  address,
  missingFields,
  rowNumber,
}: {
  address: string;
  missingFields: ReviewedHeader[];
  rowNumber: number;
}) {
  return `Row ${rowNumber} (${address || "missing address"}): missing required publication fields: ${missingFields.join(", ")}. Open pnpm review:form-export, fill these fields in the local review page, save overrides, then rerun pnpm process:form-export --force.`;
}

function getShopFromReviewedRow(row: ReviewedRow): Shop {
  return shopSchema.parse({
    address: row.address,
    borough: row.borough,
    district: row.district,
    id: row.shopId,
    lat: Number(row.lat),
    lng: Number(row.lng),
    name: row.shopName.trim() || undefined,
    status: row.status,
  });
}

function getPriceRecordFromReviewedRow(row: ReviewedRow): PriceRecord {
  return priceRecordCsvRowSchema.parse({
    confidence: row.confidence,
    id: row.priceRecordId,
    notes: row.notes,
    observedAt: row.observedAt,
    priceCents: row.priceCents,
    productType: row.productType,
    shopId: row.shopId,
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
  });
}

function sameShopPublicationFields(left: Shop, right: Shop) {
  return (
    left.name === right.name &&
    left.address === right.address &&
    left.district === right.district &&
    left.borough === right.borough &&
    left.lat === right.lat &&
    left.lng === right.lng &&
    left.status === right.status
  );
}

function samePricePublicationFields(left: PriceRecord, right: PriceRecord) {
  return (
    left.shopId === right.shopId &&
    left.observedAt === right.observedAt &&
    left.priceCents === right.priceCents &&
    left.productType === right.productType &&
    left.sourceType === right.sourceType &&
    left.confidence === right.confidence &&
    left.sourceUrl === right.sourceUrl &&
    left.notes === right.notes
  );
}

function cloneDataSet(dataSet: DataSet): DataSet {
  return {
    districts: [...dataSet.districts],
    priceRecords: [...dataSet.priceRecords],
    shops: dataSet.shops.map((shop) => ({ ...shop })),
  };
}

function getExplicitActionBlocker(rowNumber: number, action: string) {
  return `Row ${rowNumber}: unknown action "${action}". Use append, skip, correct_price, update_shop, or delete_price.`;
}

function buildRowResult({
  action,
  blockers = [],
  classification,
  override,
  row,
  rowNumber,
  warnings = [],
}: {
  action: Exclude<FormExportAction, "">;
  blockers?: string[];
  classification: ProcessFormExportClassification;
  override?: OverrideRow;
  row: ReviewedRow;
  rowNumber: number;
  warnings?: string[];
}): ProcessFormExportRowResult {
  return {
    action,
    address: row.address,
    blockers,
    classification,
    priceRecordId: row.priceRecordId,
    rowNumber,
    shopId: row.shopId,
    targetPriceRecordId: override?.targetPriceRecordId || undefined,
    targetShopId: override?.targetShopId || undefined,
    warnings,
  };
}

function getValidationBlockers(dataSet: DataSet) {
  return validateDataSet(dataSet).errors.map(
    (error) =>
      `Updated dataset validation failed at ${error.path}: ${error.message}.`,
  );
}

function collectRowProcessingResult({
  currentDataSet,
  hasExistingShopByAddress,
  override,
  row,
  rowNumber,
}: {
  currentDataSet: DataSet;
  hasExistingShopByAddress: boolean;
  override?: OverrideRow;
  row: ReviewedRow;
  rowNumber: number;
}) {
  const rawAction = override?.action?.trim() ?? "";
  const action = normalizeAction(rawAction);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const existingShop = currentDataSet.shops.find(
    (shop) => shop.id === row.shopId,
  );
  const existingPriceRecord = currentDataSet.priceRecords.find(
    (record) => record.id === row.priceRecordId,
  );

  if (rawAction && rawAction !== action) {
    blockers.push(getExplicitActionBlocker(rowNumber, rawAction));
  }

  if (action === "skip") {
    return buildRowResult({
      action,
      blockers,
      classification: "skipped",
      override,
      row,
      rowNumber,
      warnings,
    });
  }

  if (action === "delete_price") {
    const targetPriceRecordId = override?.targetPriceRecordId.trim() ?? "";
    const targetRecord = currentDataSet.priceRecords.find(
      (record) => record.id === targetPriceRecordId,
    );

    if (!targetPriceRecordId) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): delete_price requires targetPriceRecordId.`,
      );
    }

    if (targetPriceRecordId && !targetRecord) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): delete_price requires an existing targetPriceRecordId.`,
      );
    }

    if (!hasApprovedOverride(override)) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): delete_price requires approved=yes.`,
      );
    }

    return buildRowResult({
      action,
      blockers,
      classification: "price_delete",
      override: {
        ...(override ?? ({} as OverrideRow)),
        targetPriceRecordId,
      },
      row,
      rowNumber,
      warnings,
    });
  }

  if (action === "correct_price") {
    const targetPriceRecordId = override?.targetPriceRecordId.trim() ?? "";
    const targetRecord = currentDataSet.priceRecords.find(
      (record) => record.id === targetPriceRecordId,
    );

    if (!targetPriceRecordId) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): correct_price requires targetPriceRecordId.`,
      );
    }

    if (targetPriceRecordId && !targetRecord) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): correct_price requires an existing targetPriceRecordId.`,
      );
    }

    if (!hasApprovedOverride(override)) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): correct_price requires approved=yes.`,
      );
    }

    for (const field of [
      "observedAt",
      "priceCents",
      "productType",
      "sourceType",
      "confidence",
    ] satisfies ReviewedHeader[]) {
      if (!row[field]) {
        blockers.push(
          `Row ${rowNumber} (${row.address}): correct_price requires ${field}.`,
        );
      }
    }

    return buildRowResult({
      action,
      blockers,
      classification: "price_correction",
      override: {
        ...(override ?? ({} as OverrideRow)),
        targetPriceRecordId,
      },
      row,
      rowNumber,
      warnings,
    });
  }

  if (action === "update_shop") {
    const targetShopId = override?.targetShopId.trim() ?? "";
    const targetShop = currentDataSet.shops.find(
      (shop) => shop.id === targetShopId,
    );

    if (!targetShopId) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): update_shop requires targetShopId.`,
      );
    }

    if (targetShopId && !targetShop) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): update_shop requires an existing targetShopId.`,
      );
    }

    if (!hasApprovedOverride(override)) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): update_shop requires approved=yes.`,
      );
    }

    for (const field of [
      "shopId",
      "address",
      "district",
      "borough",
      "lat",
      "lng",
      "status",
    ] satisfies ReviewedHeader[]) {
      if (!row[field]) {
        blockers.push(
          `Row ${rowNumber} (${row.address || "missing address"}): update_shop requires ${field}.`,
        );
      }
    }

    const classification =
      targetShop?.status !== row.status
        ? "shop_status_update"
        : "shop_metadata_change";

    return buildRowResult({
      action,
      blockers,
      classification,
      override: {
        ...(override ?? ({} as OverrideRow)),
        targetShopId,
      },
      row,
      rowNumber,
      warnings,
    });
  }

  if (existingPriceRecord) {
    const reviewedPriceRecord = getMissingRequiredFields(row).length
      ? undefined
      : getPriceRecordFromReviewedRow(row);
    const classification =
      reviewedPriceRecord &&
      samePricePublicationFields(existingPriceRecord, reviewedPriceRecord)
        ? "duplicate_price_record"
        : "possible_correction";
    blockers.push(
      classification === "duplicate_price_record"
        ? `Row ${rowNumber} (${row.address}): price record "${row.priceRecordId}" already exists. Use action=skip to ignore it.`
        : `Row ${rowNumber} (${row.address}): price record "${row.priceRecordId}" already exists with different reviewed fields. Use action=correct_price and targetPriceRecordId=${row.priceRecordId} if this is a correction.`,
    );

    return buildRowResult({
      action,
      blockers,
      classification,
      override,
      row,
      rowNumber,
      warnings,
    });
  }

  const missingFields = getMissingRequiredFields(row);

  if (missingFields.length > 0) {
    blockers.push(
      getMissingRequiredFieldsBlocker({
        address: row.address,
        missingFields,
        rowNumber,
      }),
    );
  }

  if (!hasExistingShopByAddress && override && !hasApprovedOverride(override)) {
    blockers.push(
      `Row ${rowNumber} (${row.address}): override row must have approved=yes before automatic write.`,
    );
  }

  if (missingFields.length === 0 && existingShop) {
    const reviewedShop = getShopFromReviewedRow(row);

    if (!sameShopPublicationFields(existingShop, reviewedShop)) {
      blockers.push(
        `Row ${rowNumber} (${row.address}): reviewed shop metadata differs from current shop "${row.shopId}". Use action=update_shop and targetShopId=${row.shopId} if this is intentional.`,
      );

      return buildRowResult({
        action,
        blockers,
        classification:
          existingShop.status !== reviewedShop.status
            ? "shop_status_update"
            : "shop_metadata_change",
        override,
        row,
        rowNumber,
        warnings,
      });
    }
  }

  return buildRowResult({
    action,
    blockers,
    classification: existingShop
      ? "existing_shop_new_price"
      : "new_shop_new_price",
    override,
    row,
    rowNumber,
    warnings,
  });
}

function collectImportBlockers(dataSet: DataSet, draftCsv: string) {
  try {
    return {
      blockers: [] as string[],
      updatedDataSet: importReviewedData(dataSet, draftCsv).dataSet,
    };
  } catch (error) {
    if (error instanceof ReviewedDataImportError) {
      return {
        blockers: [
          `Reviewed import dry run failed with ${error.errors.length} error(s).`,
          ...error.errors.map((message) => `Import error: ${message}`),
        ],
        updatedDataSet: undefined,
      };
    }

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

function getParseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function applyExplicitActions({
  currentDataSet,
  rowResults,
  rows,
}: {
  currentDataSet: DataSet;
  rowResults: ProcessFormExportRowResult[];
  rows: ReviewedRow[];
}) {
  const dataSet = cloneDataSet(currentDataSet);
  const blockers: string[] = [];

  rowResults.forEach((rowResult, index) => {
    const row = rows[index];

    if (!row || rowResult.blockers.length > 0) {
      return;
    }

    if (rowResult.action === "skip" || rowResult.action === "append") {
      return;
    }

    if (rowResult.action === "delete_price") {
      const targetPriceRecordId = rowResult.targetPriceRecordId;
      const targetIndex = dataSet.priceRecords.findIndex(
        (record) => record.id === targetPriceRecordId,
      );

      if (targetIndex === -1) {
        blockers.push(
          `Row ${rowResult.rowNumber} (${row.address}): target price record "${targetPriceRecordId}" was not found for delete_price.`,
        );
        return;
      }

      dataSet.priceRecords.splice(targetIndex, 1);
      return;
    }

    if (rowResult.action === "correct_price") {
      const targetPriceRecordId = rowResult.targetPriceRecordId;
      const targetIndex = dataSet.priceRecords.findIndex(
        (record) => record.id === targetPriceRecordId,
      );

      if (targetIndex === -1) {
        blockers.push(
          `Row ${rowResult.rowNumber} (${row.address}): target price record "${targetPriceRecordId}" was not found for correct_price.`,
        );
        return;
      }

      const targetRecord = dataSet.priceRecords[targetIndex];

      try {
        dataSet.priceRecords[targetIndex] = priceRecordCsvRowSchema.parse({
          confidence: row.confidence,
          id: targetPriceRecordId,
          notes: row.notes,
          observedAt: row.observedAt,
          priceCents: row.priceCents,
          productType: row.productType,
          shopId: targetRecord?.shopId,
          sourceType: row.sourceType,
          sourceUrl: row.sourceUrl,
        });
      } catch (error) {
        blockers.push(
          `Row ${rowResult.rowNumber} (${row.address}): correct_price produced invalid price data: ${getParseErrorMessage(error)}`,
        );
      }

      return;
    }

    if (rowResult.action === "update_shop") {
      const targetShopId = rowResult.targetShopId;
      const targetIndex = dataSet.shops.findIndex(
        (shop) => shop.id === targetShopId,
      );

      if (targetIndex === -1) {
        blockers.push(
          `Row ${rowResult.rowNumber} (${row.address}): target shop "${targetShopId}" was not found for update_shop.`,
        );
        return;
      }

      try {
        dataSet.shops[targetIndex] = shopSchema.parse({
          address: row.address,
          borough: row.borough,
          district: row.district,
          id: targetShopId,
          lat: Number(row.lat),
          lng: Number(row.lng),
          name: row.shopName.trim() || undefined,
          status: row.status,
        });
      } catch (error) {
        blockers.push(
          `Row ${rowResult.rowNumber} (${row.address}): update_shop produced invalid shop data: ${getParseErrorMessage(error)}`,
        );
      }
    }
  });

  blockers.push(...getValidationBlockers(dataSet));

  return { blockers, dataSet };
}

function getAppendRows({
  rowResults,
  rows,
}: {
  rowResults: ProcessFormExportRowResult[];
  rows: ReviewedRow[];
}) {
  return rows.filter((_, index) => {
    const rowResult = rowResults[index];

    return (
      rowResult?.action === "append" &&
      rowResult.blockers.length === 0 &&
      (rowResult.classification === "new_shop_new_price" ||
        rowResult.classification === "existing_shop_new_price")
    );
  });
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
  const rowResults: ProcessFormExportRowResult[] = [];

  rows.forEach((row, index) => {
    const hasExistingShop = fillExistingShop(row, currentDataSet);
    const override = overridesByAddress.get(
      normalizeAddressForReview(row.address),
    );

    if (override) {
      applyOverride(row, override);
      row.priceRecordId = buildPriceRecordId(row);
    }

    rowResults.push(
      collectRowProcessingResult({
        currentDataSet,
        hasExistingShopByAddress: hasExistingShop,
        override,
        row,
        rowNumber: index + 1,
      }),
    );
  });

  for (const rowResult of rowResults) {
    blockers.push(...rowResult.blockers);
  }

  const draftCsv = formatReviewedRows(rows);

  if (blockers.length > 0) {
    return {
      blockers,
      canWrite: false,
      draftCsv,
      rowResults,
      selectedInputPath,
      summary: conversion.summary,
      warnings: conversion.warnings,
    };
  }

  const explicitActionCheck = applyExplicitActions({
    currentDataSet,
    rowResults,
    rows,
  });
  blockers.push(...explicitActionCheck.blockers);

  const appendRows = getAppendRows({ rowResults, rows });
  const appendCsv = formatReviewedRows(appendRows);
  const importCheck =
    appendRows.length > 0
      ? collectImportBlockers(explicitActionCheck.dataSet, appendCsv)
      : {
          blockers: [] as string[],
          updatedDataSet: explicitActionCheck.dataSet,
        };
  blockers.push(...importCheck.blockers);

  return {
    blockers,
    canWrite: blockers.length === 0,
    draftCsv,
    rowResults,
    selectedInputPath,
    summary: conversion.summary,
    updatedDataSet:
      blockers.length === 0 ? importCheck.updatedDataSet : undefined,
    warnings: conversion.warnings,
  };
}
