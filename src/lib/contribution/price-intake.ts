import { productTypes, sourceTypes } from "../validation/options";

export type PriceIntakeRow = {
  district: string;
  notes: string;
  observedAt: string;
  priceEuro: string;
  productType: string;
  shopAddress: string;
  shopName: string;
  sourceContext: string;
  sourceType: string;
  sourceUrl: string;
};

export type PriceIntakeField = keyof PriceIntakeRow;

export type PriceIntakeErrorCode =
  | "invalid_date"
  | "invalid_price"
  | "invalid_product_type"
  | "invalid_source_type"
  | "invalid_url"
  | "required";

export type PriceIntakeError = {
  code: PriceIntakeErrorCode;
  field: PriceIntakeField;
  rowIndex: number;
};

export type NormalizedPriceIntakeRow = PriceIntakeRow & {
  priceCents: number;
};

export const PRICE_INTAKE_CSV_HEADERS = [
  "shopName",
  "shopAddress",
  "district",
  "observedAt",
  "priceEuro",
  "priceCents",
  "productType",
  "sourceType",
  "sourceUrl",
  "sourceContext",
  "notes",
] as const;

const requiredFields = [
  "shopAddress",
  "observedAt",
  "priceEuro",
  "productType",
  "sourceType",
  "sourceContext",
] as const satisfies readonly PriceIntakeField[];

const productTypeSet = new Set<string>(productTypes);
const sourceTypeSet = new Set<string>(sourceTypes);

function trimmed(value: string) {
  return value.trim();
}

function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseEuroPriceToCents(value: string) {
  const normalized = trimmed(value)
    .replace(/\s+/g, "")
    .replace(/^€/, "")
    .replace(/€$/u, "")
    .replace(/eur$/i, "")
    .replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    return undefined;
  }

  const euros = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const totalCents = euros * 100 + cents;

  if (totalCents < 100 || totalCents > 5000) {
    return undefined;
  }

  return totalCents;
}

function isPublicHttpUrl(value: string) {
  if (!trimmed(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function escapeCsvCell(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function escapeMarkdownCell(value: string | number | undefined) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .trim();
}

export function createEmptyPriceIntakeRow(): PriceIntakeRow {
  return {
    district: "",
    notes: "",
    observedAt: "",
    priceEuro: "",
    productType: "standard_doener",
    shopAddress: "",
    shopName: "",
    sourceContext: "",
    sourceType: "user_submission",
    sourceUrl: "",
  };
}

export function validatePriceIntakeRows(rows: PriceIntakeRow[]) {
  const errors: PriceIntakeError[] = [];
  const normalizedRows: NormalizedPriceIntakeRow[] = [];

  rows.forEach((row, rowIndex) => {
    for (const field of requiredFields) {
      if (!trimmed(row[field])) {
        errors.push({ code: "required", field, rowIndex });
      }
    }

    if (trimmed(row.observedAt) && !isIsoDate(row.observedAt)) {
      errors.push({ code: "invalid_date", field: "observedAt", rowIndex });
    }

    const priceCents = parseEuroPriceToCents(row.priceEuro);
    if (trimmed(row.priceEuro) && priceCents === undefined) {
      errors.push({ code: "invalid_price", field: "priceEuro", rowIndex });
    }

    if (trimmed(row.productType) && !productTypeSet.has(row.productType)) {
      errors.push({
        code: "invalid_product_type",
        field: "productType",
        rowIndex,
      });
    }

    if (trimmed(row.sourceType) && !sourceTypeSet.has(row.sourceType)) {
      errors.push({
        code: "invalid_source_type",
        field: "sourceType",
        rowIndex,
      });
    }

    if (!isPublicHttpUrl(row.sourceUrl)) {
      errors.push({ code: "invalid_url", field: "sourceUrl", rowIndex });
    }

    if (priceCents !== undefined) {
      normalizedRows.push({
        ...row,
        district: trimmed(row.district),
        notes: trimmed(row.notes),
        observedAt: trimmed(row.observedAt),
        priceEuro: trimmed(row.priceEuro),
        priceCents,
        shopAddress: trimmed(row.shopAddress),
        shopName: trimmed(row.shopName),
        sourceContext: trimmed(row.sourceContext),
        sourceUrl: trimmed(row.sourceUrl),
      });
    }
  });

  return {
    errors,
    normalizedRows: errors.length === 0 ? normalizedRows : [],
    valid: errors.length === 0,
  };
}

export function formatPriceIntakeRowsAsCsv(rows: NormalizedPriceIntakeRow[]) {
  const header = PRICE_INTAKE_CSV_HEADERS.join(",");
  const body = rows.map((row) =>
    [
      row.shopName,
      row.shopAddress,
      row.district,
      row.observedAt,
      row.priceEuro,
      row.priceCents,
      row.productType,
      row.sourceType,
      row.sourceUrl,
      row.sourceContext,
      row.notes,
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return `${[header, ...body].join("\n")}\n`;
}

export function formatPriceIntakeRowsAsMarkdown(
  rows: NormalizedPriceIntakeRow[],
) {
  const header = `| ${PRICE_INTAKE_CSV_HEADERS.join(" | ")} |`;
  const separator = `| ${PRICE_INTAKE_CSV_HEADERS.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) =>
      `| ${[
        row.shopName,
        row.shopAddress,
        row.district,
        row.observedAt,
        row.priceEuro,
        row.priceCents,
        row.productType,
        row.sourceType,
        row.sourceUrl,
        row.sourceContext,
        row.notes,
      ]
        .map(escapeMarkdownCell)
        .join(" | ")} |`,
  );

  return [header, separator, ...body].join("\n");
}
