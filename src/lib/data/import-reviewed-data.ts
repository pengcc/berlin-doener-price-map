import { parse } from "csv-parse/sync";
import {
  type PriceRecord,
  priceRecordCsvRowSchema,
  type Shop,
  shopSchema,
} from "../validation/schemas";
import type { DataSet } from "./load-data";
import { PRICE_RECORD_HEADERS } from "./load-price-records";

export const REVIEWED_DATA_HEADERS = [
  "shopId",
  "priceRecordId",
  "shopName",
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
  "sourceUrl",
  "notes",
] as const;

export type ReviewedDataImportResult = {
  dataSet: DataSet;
  summary: {
    newPriceRecords: number;
    newShops: number;
    reviewedRows: number;
  };
};

export class ReviewedDataImportError extends Error {
  constructor(readonly errors: string[]) {
    super(`Reviewed data import failed with ${errors.length} error(s).`);
    this.name = "ReviewedDataImportError";
  }
}

function parseRows(input: string) {
  return parse(input, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

function assertHeaders(input: string) {
  const [firstLine] = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  const actualHeaders = parse(firstLine ?? "", {
    relax_column_count: true,
  })[0] as string[] | undefined;
  const expectedHeaders = [...REVIEWED_DATA_HEADERS];

  if (!actualHeaders) {
    throw new ReviewedDataImportError([
      `Reviewed data CSV must include the canonical header row: ${expectedHeaders.join(",")}`,
    ]);
  }

  if (
    actualHeaders.length !== expectedHeaders.length ||
    actualHeaders.some((header, index) => header !== expectedHeaders[index])
  ) {
    throw new ReviewedDataImportError([
      `Reviewed data CSV header must be: ${expectedHeaders.join(",")}`,
    ]);
  }
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function rowsToRecords(rows: Record<string, string>[]) {
  return rows.map((row, index) => {
    const shop = shopSchema.parse({
      address: row.address,
      borough: row.borough,
      district: row.district,
      id: row.shopId,
      lat: Number(row.lat),
      lng: Number(row.lng),
      name: optionalText(row.shopName),
      status: row.status,
    });
    const priceRecord = priceRecordCsvRowSchema.parse({
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

    return { index, priceRecord, shop };
  });
}

function pushDuplicateMessages(ids: string[], label: string, errors: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  for (const id of duplicates) {
    errors.push(`Duplicate ${label} id "${id}" in reviewed CSV.`);
  }
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

function compareExistingShops(
  existingShops: Map<string, Shop>,
  reviewedShops: Map<string, Shop>,
  errors: string[],
) {
  for (const [shopId, reviewedShop] of reviewedShops) {
    const existingShop = existingShops.get(shopId);

    if (
      existingShop &&
      !sameShopPublicationFields(existingShop, reviewedShop)
    ) {
      errors.push(
        `Reviewed row for existing shop "${shopId}" conflicts with current shop metadata.`,
      );
    }
  }
}

function escapeCsvCell(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function formatPriceRecordsCsv(priceRecords: PriceRecord[]) {
  const header = PRICE_RECORD_HEADERS.join(",");
  const body = priceRecords.map((record) =>
    [
      record.id,
      record.shopId,
      record.observedAt,
      record.priceCents,
      record.productType,
      record.sourceType,
      record.confidence,
      record.sourceUrl,
      record.notes,
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return `${[header, ...body].join("\n")}\n`;
}

export function importReviewedData(
  currentDataSet: DataSet,
  csvInput: string,
): ReviewedDataImportResult {
  assertHeaders(csvInput);

  const rows = rowsToRecords(parseRows(csvInput));
  const errors: string[] = [];
  const existingShops = new Map(
    currentDataSet.shops.map((shop) => [shop.id, shop]),
  );
  const existingPriceRecordIds = new Set(
    currentDataSet.priceRecords.map((record) => record.id),
  );
  const reviewedShops = new Map<string, Shop>();

  pushDuplicateMessages(
    rows.map(({ priceRecord }) => priceRecord.id),
    "price record",
    errors,
  );

  for (const { priceRecord, shop } of rows) {
    if (existingPriceRecordIds.has(priceRecord.id)) {
      errors.push(`Price record "${priceRecord.id}" already exists.`);
    }

    const reviewedShop = reviewedShops.get(shop.id);
    if (reviewedShop && !sameShopPublicationFields(reviewedShop, shop)) {
      errors.push(
        `Reviewed CSV contains conflicting metadata for shop "${shop.id}".`,
      );
    }

    reviewedShops.set(shop.id, shop);
  }

  compareExistingShops(existingShops, reviewedShops, errors);

  if (errors.length > 0) {
    throw new ReviewedDataImportError(errors);
  }

  const newShops = [...reviewedShops.values()].filter(
    (shop) => !existingShops.has(shop.id),
  );
  const newPriceRecords = rows.map(({ priceRecord }) => priceRecord);

  return {
    dataSet: {
      districts: currentDataSet.districts,
      priceRecords: [...currentDataSet.priceRecords, ...newPriceRecords],
      shops: [...currentDataSet.shops, ...newShops],
    },
    summary: {
      newPriceRecords: newPriceRecords.length,
      newShops: newShops.length,
      reviewedRows: rows.length,
    },
  };
}
