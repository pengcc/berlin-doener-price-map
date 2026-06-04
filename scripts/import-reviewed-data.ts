import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ZodError } from "zod";
import {
  formatPriceRecordsCsv,
  importReviewedData,
  ReviewedDataImportError,
} from "../src/lib/data/import-reviewed-data";
import { parseReviewedDataImportArgs } from "../src/lib/data/import-reviewed-data-cli";
import { loadDataSet } from "../src/lib/data/load-data";

function printUsage() {
  console.log(
    "Usage: pnpm import:reviewed-data -- <reviewed-data.csv> [--write]",
  );
}

const { inputPath, write } = parseReviewedDataImportArgs(process.argv.slice(2));

if (!inputPath) {
  printUsage();
  process.exitCode = 1;
} else {
  try {
    const currentDataSet = loadDataSet();
    const reviewedCsv = readFileSync(resolve(inputPath), "utf8");
    const result = importReviewedData(currentDataSet, reviewedCsv);

    console.log(
      `Reviewed data import ${write ? "write" : "dry run"} passed: ${result.summary.reviewedRows} reviewed row(s), ${result.summary.newShops} new shop(s), ${result.summary.newPriceRecords} new price record(s).`,
    );

    if (write) {
      writeFileSync(
        join(process.cwd(), "data", "shops.json"),
        `${JSON.stringify(result.dataSet.shops, null, 2)}\n`,
      );
      writeFileSync(
        join(process.cwd(), "data", "price-records.csv"),
        formatPriceRecordsCsv(result.dataSet.priceRecords),
      );
    } else {
      console.log("No files were changed. Re-run with --write to update data.");
    }
  } catch (error) {
    console.error("Reviewed data import failed.");

    if (error instanceof ReviewedDataImportError) {
      for (const message of error.errors) {
        console.error(`- ${message}`);
      }
    } else if (error instanceof ZodError) {
      for (const issue of error.issues) {
        console.error(
          `- ${issue.path.join(".") || "<root>"}: ${issue.message}`,
        );
      }
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  }
}
