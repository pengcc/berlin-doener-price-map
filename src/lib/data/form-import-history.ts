import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  FORM_SUBMISSION_ARCHIVE_DIR,
  IMPORT_HISTORY_DIR,
  IMPORT_HISTORY_PATH,
  REVIEWED_IMPORTS_ARCHIVE_DIR,
} from "./form-review-tool";
import type { ProcessFormExportRowResult } from "./process-form-export";

export type FormImportHistoryEntry = {
  archivedDraftPath: string;
  archivedSourcePath: string;
  draftPath: string;
  id: string;
  importedAt: string;
  rowCount: number;
  rows: Array<{
    action: ProcessFormExportRowResult["action"];
    address: string;
    classification: ProcessFormExportRowResult["classification"];
    priceRecordId: string;
    rowNumber: number;
    shopId: string;
    targetPriceRecordId?: string;
    targetShopId?: string;
  }>;
  sourcePath: string;
  writeResult: "production_updated";
};

export type FormImportHistory = {
  entries: FormImportHistoryEntry[];
  version: 1;
};

function timestampForFile(date: Date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:]/g, "-");
}

function getUniqueArchivePath(directory: string, filePath: string, date: Date) {
  const fileName = `${timestampForFile(date)}-${basename(filePath)}`;
  let candidate = join(directory, fileName);
  let counter = 2;

  while (existsSync(candidate)) {
    candidate = join(
      directory,
      `${timestampForFile(date)}-${counter}-${basename(filePath)}`,
    );
    counter += 1;
  }

  return candidate;
}

export function ensureImportHistoryDirectories() {
  mkdirSync(FORM_SUBMISSION_ARCHIVE_DIR, { recursive: true });
  mkdirSync(REVIEWED_IMPORTS_ARCHIVE_DIR, { recursive: true });
  mkdirSync(IMPORT_HISTORY_DIR, { recursive: true });
}

export function readFormImportHistory(
  historyPath = IMPORT_HISTORY_PATH,
): FormImportHistory {
  if (!existsSync(historyPath)) {
    return { entries: [], version: 1 };
  }

  const parsed = JSON.parse(readFileSync(historyPath, "utf8")) as
    | FormImportHistory
    | FormImportHistoryEntry[];

  if (Array.isArray(parsed)) {
    return { entries: parsed, version: 1 };
  }

  return {
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    version: 1,
  };
}

export function archiveSuccessfulFormImport({
  draftArchiveDir = REVIEWED_IMPORTS_ARCHIVE_DIR,
  date = new Date(),
  draftPath,
  historyPath = IMPORT_HISTORY_PATH,
  rowResults,
  sourceArchiveDir = FORM_SUBMISSION_ARCHIVE_DIR,
  sourcePath,
}: {
  date?: Date;
  draftArchiveDir?: string;
  draftPath: string;
  historyPath?: string;
  rowResults: ProcessFormExportRowResult[];
  sourceArchiveDir?: string;
  sourcePath: string;
}) {
  mkdirSync(sourceArchiveDir, { recursive: true });
  mkdirSync(draftArchiveDir, { recursive: true });
  mkdirSync(dirname(historyPath), { recursive: true });

  const archivedSourcePath = getUniqueArchivePath(
    sourceArchiveDir,
    sourcePath,
    date,
  );
  const archivedDraftPath = getUniqueArchivePath(
    draftArchiveDir,
    draftPath,
    date,
  );
  const history = readFormImportHistory(historyPath);
  const importedAt = date.toISOString();
  const entry: FormImportHistoryEntry = {
    archivedDraftPath,
    archivedSourcePath,
    draftPath,
    id: `${timestampForFile(date)}-${basename(sourcePath)}`,
    importedAt,
    rowCount: rowResults.length,
    rows: rowResults.map((row) => ({
      action: row.action,
      address: row.address,
      classification: row.classification,
      priceRecordId: row.priceRecordId,
      rowNumber: row.rowNumber,
      shopId: row.shopId,
      targetPriceRecordId: row.targetPriceRecordId,
      targetShopId: row.targetShopId,
    })),
    sourcePath,
    writeResult: "production_updated",
  };

  renameSync(sourcePath, archivedSourcePath);
  renameSync(draftPath, archivedDraftPath);
  writeFileSync(
    historyPath,
    `${JSON.stringify({ entries: [...history.entries, entry], version: 1 }, null, 2)}\n`,
  );

  return entry;
}
