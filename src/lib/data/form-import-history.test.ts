import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  archiveSuccessfulFormImport,
  readFormImportHistory,
} from "./form-import-history";
import type { ProcessFormExportRowResult } from "./process-form-export";

const rowResult: ProcessFormExportRowResult = {
  action: "append",
  address: "Lipschitzallee 27, 12351 Berlin",
  blockers: [],
  classification: "new_shop_new_price",
  priceRecordId: "price-douran-doener-neukoelln-2026-06-03-standard-doener",
  rowNumber: 1,
  shopId: "douran-doener-neukoelln",
  warnings: [],
};

describe("form import history", () => {
  it("archives source and draft files and appends a history entry", () => {
    const root = mkdtempSync(join(tmpdir(), "doener-form-import-"));
    const sourcePath = join(root, "source.csv");
    const draftPath = join(root, "draft.csv");
    const sourceArchiveDir = join(root, "source-archive");
    const draftArchiveDir = join(root, "draft-archive");
    const historyPath = join(root, "history", "form-import-history.json");

    writeFileSync(sourcePath, "raw\n");
    writeFileSync(draftPath, "reviewed\n");

    const entry = archiveSuccessfulFormImport({
      date: new Date("2026-06-05T10:00:00.000Z"),
      draftArchiveDir,
      draftPath,
      historyPath,
      rowResults: [rowResult],
      sourceArchiveDir,
      sourcePath,
    });

    expect(existsSync(sourcePath)).toBe(false);
    expect(existsSync(draftPath)).toBe(false);
    expect(readFileSync(entry.archivedSourcePath, "utf8")).toBe("raw\n");
    expect(readFileSync(entry.archivedDraftPath, "utf8")).toBe("reviewed\n");

    const history = readFormImportHistory(historyPath);

    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]?.rowCount).toBe(1);
    expect(history.entries[0]?.rows[0]?.classification).toBe(
      "new_shop_new_price",
    );
  });
});
