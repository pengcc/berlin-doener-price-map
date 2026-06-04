import { parse } from "csv-parse/sync";
import { REVIEWED_DATA_HEADERS } from "./import-reviewed-data";

type GoogleFormRow = Record<string, string | undefined>;

type ReviewedDraftRow = Record<(typeof REVIEWED_DATA_HEADERS)[number], string>;

export type FormResponseConversionResult = {
  csv: string;
  summary: {
    rowsConverted: number;
  };
  warnings: string[];
};

const REQUIRED_GOOGLE_FORM_HEADERS = [
  "Shop name",
  "Observation date",
  "Observed price in EUR",
  "Product Type",
  "Evidence/source type",
  "Public source URL",
  "Notes",
  "Shop address",
  "District or neighborhood",
] as const;

const PRODUCT_TYPE_BY_LABEL = new Map([
  ["standard", "standard_doener"],
  ["standard doener", "standard_doener"],
  ["standard döner", "standard_doener"],
  ["chicken doener", "chicken_doener"],
  ["chicken döner", "chicken_doener"],
  ["veal doener", "veal_doener"],
  ["veal döner", "veal_doener"],
  ["gemuese doener", "gemuese_doener"],
  ["gemüse döner", "gemuese_doener"],
  ["vegan doener", "vegan_doener"],
  ["vegan döner", "vegan_doener"],
  ["dueruem", "dueruem"],
  ["dürüm", "dueruem"],
  ["doener box", "doener_box"],
  ["döner box", "doener_box"],
]);

const SOURCE_TYPE_BY_LABEL = new Map([
  ["in-store observation", "user_submission"],
  ["in store observation", "user_submission"],
  ["onsite observation", "user_submission"],
  ["on site", "user_submission"],
  ["menu photo", "menu_photo"],
  ["official shop website", "shop_website"],
  ["delivery platform", "delivery_platform"],
  ["other or unsure", "unknown"],
  ["unsure", "unknown"],
  ["unknown", "unknown"],
]);

const CONFIDENCE_BY_SOURCE_TYPE = new Map([
  ["delivery_platform", "55"],
  ["menu_photo", "90"],
  ["shop_website", "85"],
  ["unknown", "40"],
  ["user_submission", "65"],
]);

export class FormResponseConversionError extends Error {
  constructor(readonly errors: string[]) {
    super(`Form response conversion failed with ${errors.length} error(s).`);
    this.name = "FormResponseConversionError";
  }
}

function parseRows(input: string) {
  return parse(input, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as GoogleFormRow[];
}

function getHeaders(input: string) {
  const [firstLine] = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  return parse(firstLine ?? "", {
    relax_column_count: true,
  })[0] as string[] | undefined;
}

function assertGoogleFormHeaders(input: string) {
  const headers = getHeaders(input);
  const missingHeaders = REQUIRED_GOOGLE_FORM_HEADERS.filter(
    (header) => !headers?.includes(header),
  );

  if (missingHeaders.length > 0) {
    throw new FormResponseConversionError([
      `Google Forms CSV is missing required header(s): ${missingHeaders.join(", ")}`,
    ]);
  }
}

function normalizeLabel(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function normalizeDistrict(value: string | undefined) {
  const trimmed = normalizeOptionalText(value);
  return /^unsure\b/i.test(trimmed) ? "" : trimmed;
}

function normalizeProductType(value: string | undefined) {
  return PRODUCT_TYPE_BY_LABEL.get(normalizeLabel(value)) ?? "";
}

function normalizeSourceType(value: string | undefined) {
  return SOURCE_TYPE_BY_LABEL.get(normalizeLabel(value)) ?? "unknown";
}

function parseDate(value: string | undefined) {
  const trimmed = normalizeOptionalText(value);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (isoMatch) {
    return trimmed;
  }

  const germanMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);

  if (!germanMatch) {
    return "";
  }

  const [, day, month, year] = germanMatch;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parsePriceCents(value: string | undefined) {
  const normalized = normalizeOptionalText(value)
    .replace(/\s*eur$/i, "")
    .replace(",", ".");
  const price = Number(normalized);

  if (!Number.isFinite(price)) {
    return "";
  }

  return String(Math.round(price * 100));
}

function extractPostcode(value: string | undefined) {
  return /\b(1\d{4})\b/.exec(value ?? "")?.[1] ?? "";
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

function buildShopId(row: GoogleFormRow, rowNumber: number) {
  const shopName = normalizeOptionalText(row["Shop name"]);
  const district = normalizeDistrict(row["District or neighborhood"]);
  const postcode = extractPostcode(row["Shop address"]);
  const fallback = `form-row-${rowNumber}`;
  const parts = [shopName || fallback, district || postcode].filter(Boolean);

  return slugify(parts.join(" ")) || fallback;
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function formatReviewedDraftCsv(rows: ReviewedDraftRow[]) {
  const body = rows.map((row) =>
    REVIEWED_DATA_HEADERS.map((header) => escapeCsvCell(row[header])).join(","),
  );

  return `${[REVIEWED_DATA_HEADERS.join(","), ...body].join("\n")}\n`;
}

function makeUnique(value: string, seen: Map<string, number>) {
  const count = seen.get(value) ?? 0;
  seen.set(value, count + 1);

  if (count === 0) {
    return value;
  }

  return `${value}-${count + 1}`;
}

function buildSafeDraftNote(sourceType: string) {
  const sourceLabel =
    sourceType === "user_submission"
      ? "public form submission"
      : `${sourceType.replaceAll("_", " ")} public form submission`;

  return `Draft from ${sourceLabel}; verify before publication.`;
}

export function convertGoogleFormResponsesToReviewedDraftCsv(
  input: string,
): FormResponseConversionResult {
  assertGoogleFormHeaders(input);

  const rows = parseRows(input);
  const warnings: string[] = [];
  const seenShopIds = new Map<string, number>();
  const seenPriceRecordIds = new Map<string, number>();
  const draftRows = rows.map((row, index): ReviewedDraftRow => {
    const rowNumber = index + 1;
    const shopId = makeUnique(buildShopId(row, rowNumber), seenShopIds);
    const observedAt = parseDate(row["Observation date"]);
    const productType = normalizeProductType(row["Product Type"]);
    const sourceType = normalizeSourceType(row["Evidence/source type"]);
    const priceRecordBase = slugify(
      ["price", shopId, observedAt, productType].filter(Boolean).join(" "),
    );
    const priceRecordId = makeUnique(
      priceRecordBase || `price-form-row-${rowNumber}`,
      seenPriceRecordIds,
    );

    if (!observedAt) {
      warnings.push(`Row ${rowNumber}: observation date needs review.`);
    }

    if (!productType) {
      warnings.push(`Row ${rowNumber}: product type needs review.`);
    }

    return {
      address: normalizeOptionalText(row["Shop address"]),
      borough: "",
      confidence: CONFIDENCE_BY_SOURCE_TYPE.get(sourceType) ?? "40",
      district: normalizeDistrict(row["District or neighborhood"]),
      lat: "",
      lng: "",
      notes: buildSafeDraftNote(sourceType),
      observedAt,
      priceCents: parsePriceCents(row["Observed price in EUR"]),
      priceRecordId,
      productType,
      shopId,
      shopName: normalizeOptionalText(row["Shop name"]),
      sourceType,
      sourceUrl: normalizeOptionalText(row["Public source URL"]),
      status: "unknown",
    };
  });

  if (draftRows.length > 0) {
    warnings.push(
      "Draft rows still need maintainer review for borough, lat, lng, status, confidence, and public-safe notes before import.",
    );
  }

  return {
    csv: formatReviewedDraftCsv(draftRows),
    summary: {
      rowsConverted: draftRows.length,
    },
    warnings,
  };
}
