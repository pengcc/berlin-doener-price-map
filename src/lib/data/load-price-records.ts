import { parse } from "csv-parse/sync";
import {
  type PriceRecord,
  priceRecordCsvRowSchema,
} from "../validation/schemas";
import { readDataFile } from "./read-data-file";

export const PRICE_RECORD_HEADERS = [
  "id",
  "shopId",
  "observedAt",
  "priceCents",
  "productType",
  "sourceType",
  "confidence",
  "sourceUrl",
  "notes",
] as const;

function parseCsvRows(input: string) {
  return parse(input, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];
}

function assertPriceRecordHeaders(headers: string[]) {
  const expected = [...PRICE_RECORD_HEADERS];

  if (headers.length !== expected.length) {
    throw new Error(
      `price-records.csv must use ${expected.length} columns: ${expected.join(",")}`,
    );
  }

  for (const [index, expectedHeader] of expected.entries()) {
    if (headers[index] !== expectedHeader) {
      throw new Error(
        `price-records.csv column ${index + 1} must be "${expectedHeader}", received "${headers[index] ?? ""}"`,
      );
    }
  }
}

export function parsePriceRecordsCsv(input: string): PriceRecord[] {
  const rows = parseCsvRows(input);
  const [headers, ...records] = rows;

  if (!headers) {
    throw new Error("price-records.csv must include the canonical header row");
  }

  assertPriceRecordHeaders(headers);

  return records.map((record, index) => {
    if (record.length !== headers.length) {
      throw new Error(
        `price-records.csv row ${index + 2} must have ${headers.length} columns, received ${record.length}`,
      );
    }

    const row = Object.fromEntries(
      headers.map((header, headerIndex) => [header, record[headerIndex] ?? ""]),
    );

    return priceRecordCsvRowSchema.parse(row);
  });
}

export function loadPriceRecords(dataDirectory?: string): PriceRecord[] {
  return parsePriceRecordsCsv(readDataFile("price-records.csv", dataDirectory));
}
