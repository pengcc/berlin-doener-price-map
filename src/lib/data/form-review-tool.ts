import { basename, join, parse as parsePath } from "node:path";
import { parse } from "csv-parse/sync";
import { REVIEWED_DATA_HEADERS } from "./import-reviewed-data";
import type { DataSet } from "./load-data";
import {
  normalizeAddressForReview,
  type ProcessFormExportResult,
  processFormExportData,
  selectNewestCsv,
} from "./process-form-export";

export const FORM_REVIEW_DEFAULT_HOST = "127.0.0.1";
export const FORM_REVIEW_DEFAULT_PORT = 4317;
export const FORM_SUBMISSION_DIR = "dev_locals/data/form-submission";
export const REVIEWED_IMPORTS_DIR = "dev_locals/data/reviewed-imports";
export const REVIEW_OVERRIDES_DIR = "dev_locals/data/review-overrides";
export const REVIEW_OVERRIDES_PATH = `${REVIEW_OVERRIDES_DIR}/form-export-overrides.csv`;

export const FORM_EXPORT_OVERRIDE_HEADERS = [
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

export type FormExportOverrideHeader =
  (typeof FORM_EXPORT_OVERRIDE_HEADERS)[number];
export type FormExportOverrideRow = Record<FormExportOverrideHeader, string>;
export type ReviewedDraftRow = Record<
  (typeof REVIEWED_DATA_HEADERS)[number],
  string
>;
export type RawFormRow = Record<string, string>;

export type ReviewToolArgs = {
  host: string;
  inputPath?: string;
  port: number;
};

type FileCandidate = {
  mtimeMs: number;
  path: string;
};

export type ReviewToolRow = {
  override: FormExportOverrideRow;
  raw: RawFormRow;
  reviewed: ReviewedDraftRow;
  rowNumber: number;
};

export type ReviewToolState = {
  draftOutputPath?: string;
  inputPath?: string;
  result: ProcessFormExportResult;
  rows: ReviewToolRow[];
};

export type ReviewToolPipelineResult = {
  dataSetToWrite?: DataSet;
  state: ReviewToolState;
  wroteProduction: boolean;
};

type ReviewRequestHeaders = Record<string, string | string[] | undefined>;

function parseCsvRows(input: string) {
  return parse(input, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawFormRow[];
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function assertNextArg(args: string[], index: number, flag: string) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function parsePort(value: string) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Review tool port must be an integer from 1 to 65535.`);
  }

  return port;
}

function buildEditableOverride(
  reviewed: ReviewedDraftRow,
  override: FormExportOverrideRow | undefined,
): FormExportOverrideRow {
  return {
    address: override?.address || reviewed.address,
    approved: override?.approved ?? "",
    borough: override?.borough || reviewed.borough,
    confidence: override?.confidence || reviewed.confidence,
    district: override?.district || reviewed.district,
    lat: override?.lat || reviewed.lat,
    lng: override?.lng || reviewed.lng,
    notes: override?.notes || reviewed.notes,
    shopId: override?.shopId || reviewed.shopId,
    shopName: override?.shopName || reviewed.shopName,
    sourceUrl: override?.sourceUrl || reviewed.sourceUrl,
    status: override?.status || reviewed.status,
  };
}

function indexOverridesByAddress(overrides: FormExportOverrideRow[]) {
  return new Map(
    overrides
      .filter((row) => row.address)
      .map((row) => [normalizeAddressForReview(row.address), row]),
  );
}

export function parseReviewToolArgs(args: string[]): ReviewToolArgs {
  let host = FORM_REVIEW_DEFAULT_HOST;
  let inputPath: string | undefined;
  let port = FORM_REVIEW_DEFAULT_PORT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error("help");
    }

    if (arg === "--port") {
      port = parsePort(assertNextArg(args, index, "--port"));
      index += 1;
      continue;
    }

    if (arg?.startsWith("--port=")) {
      port = parsePort(arg.slice("--port=".length));
      continue;
    }

    if (arg === "--host") {
      host = assertNextArg(args, index, "--host");
      index += 1;
      continue;
    }

    if (arg?.startsWith("--host=")) {
      host = arg.slice("--host=".length);
      continue;
    }

    if (arg?.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    inputPath ??= arg;
  }

  assertLoopbackHost(host);

  return { host, inputPath, port };
}

export function assertLoopbackHost(host: string) {
  if (
    host !== FORM_REVIEW_DEFAULT_HOST &&
    host !== "localhost" &&
    host !== "::1"
  ) {
    throw new Error(
      `Local form review server must bind to a loopback host, not "${host}".`,
    );
  }
}

export function resolveReviewToolInputPath({
  candidates,
  requestedInputPath,
}: {
  candidates: FileCandidate[];
  requestedInputPath?: string;
}) {
  return requestedInputPath ?? selectNewestCsv(candidates);
}

export function getDraftOutputPath(
  inputPath: string,
  reviewedImportsDir = REVIEWED_IMPORTS_DIR,
) {
  const parsed = parsePath(basename(inputPath));
  return join(reviewedImportsDir, `${parsed.name}.reviewed-draft.csv`);
}

export function parseReviewedDraftRows(csvInput: string) {
  return parseCsvRows(csvInput).map((row) => {
    const reviewedRow = {} as ReviewedDraftRow;

    for (const header of REVIEWED_DATA_HEADERS) {
      reviewedRow[header] = row[header] ?? "";
    }

    return reviewedRow;
  });
}

export function normalizeOverrideRows(
  rows: Array<Partial<Record<FormExportOverrideHeader, unknown>>>,
) {
  return rows
    .map((row) => {
      const override = {} as FormExportOverrideRow;

      for (const header of FORM_EXPORT_OVERRIDE_HEADERS) {
        override[header] = normalizeCell(row[header]);
      }

      return override;
    })
    .filter((row) => row.address);
}

export function parseOverrideRows(csvInput: string | undefined) {
  if (!csvInput?.trim()) {
    return [] satisfies FormExportOverrideRow[];
  }

  return normalizeOverrideRows(parseCsvRows(csvInput));
}

export function formatOverrideRows(
  rows: Array<Partial<Record<FormExportOverrideHeader, unknown>>>,
) {
  const normalizedRows = normalizeOverrideRows(rows);
  const body = normalizedRows.map((row) =>
    FORM_EXPORT_OVERRIDE_HEADERS.map((header) =>
      escapeCsvCell(row[header]),
    ).join(","),
  );

  return `${[FORM_EXPORT_OVERRIDE_HEADERS.join(","), ...body].join("\n")}\n`;
}

export function buildReviewToolState({
  currentDataSet,
  overrideCsv,
  rawCsv,
  selectedInputPath,
}: {
  currentDataSet: DataSet;
  overrideCsv?: string;
  rawCsv: string;
  selectedInputPath?: string;
}): ReviewToolState {
  const result = processFormExportData({
    currentDataSet,
    overrideCsv,
    rawCsv,
    selectedInputPath,
  });
  const overridesByAddress = indexOverridesByAddress(
    parseOverrideRows(overrideCsv),
  );
  const rawRows = parseCsvRows(rawCsv);
  const rows = parseReviewedDraftRows(result.draftCsv).map(
    (reviewed, index): ReviewToolRow => {
      const override = overridesByAddress.get(
        normalizeAddressForReview(reviewed.address),
      );

      return {
        override: buildEditableOverride(reviewed, override),
        raw: rawRows[index] ?? {},
        reviewed,
        rowNumber: index + 1,
      };
    },
  );

  return {
    draftOutputPath: selectedInputPath
      ? getDraftOutputPath(selectedInputPath)
      : undefined,
    inputPath: selectedInputPath,
    result,
    rows,
  };
}

export function runReviewToolPipeline({
  currentDataSet,
  overrideCsv,
  rawCsv,
  selectedInputPath,
  writeRequested,
}: {
  currentDataSet: DataSet;
  overrideCsv?: string;
  rawCsv: string;
  selectedInputPath?: string;
  writeRequested: boolean;
}): ReviewToolPipelineResult {
  const state = buildReviewToolState({
    currentDataSet,
    overrideCsv,
    rawCsv,
    selectedInputPath,
  });
  const dataSetToWrite =
    writeRequested && state.result.canWrite
      ? state.result.updatedDataSet
      : undefined;

  return {
    dataSetToWrite,
    state,
    wroteProduction: Boolean(dataSetToWrite),
  };
}

export function isAuthorizedReviewRequest({
  headers,
  token,
  url,
}: {
  headers: ReviewRequestHeaders;
  token: string;
  url: URL;
}) {
  const headerValue = headers["x-review-token"];
  const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  return headerToken === token || url.searchParams.get("token") === token;
}
