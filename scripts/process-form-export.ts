import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, parse, resolve } from "node:path";
import { formatPriceRecordsCsv } from "../src/lib/data/import-reviewed-data";
import { loadDataSet } from "../src/lib/data/load-data";
import {
  processFormExportData,
  selectNewestCsv,
} from "../src/lib/data/process-form-export";

const FORM_SUBMISSION_DIR = "dev_locals/data/form-submission";
const REVIEWED_IMPORTS_DIR = "dev_locals/data/reviewed-imports";
const REVIEW_OVERRIDES_DIR = "dev_locals/data/review-overrides";
const REVIEW_OVERRIDES_PATH = `${REVIEW_OVERRIDES_DIR}/form-export-overrides.csv`;

type Args = {
  dryRun: boolean;
  force: boolean;
  inputPath: string | undefined;
};

function printUsage() {
  console.log(
    "Usage: pnpm process:form-export [-- <raw-google-export.csv>] [--dry-run] [--force]",
  );
}

function parseArgs(args: string[]): Args {
  let dryRun = false;
  let force = false;
  let inputPath: string | undefined;

  for (const arg of args) {
    if (arg === "--") {
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--force") {
      force = true;
      continue;
    }

    inputPath ??= arg;
  }

  return { dryRun, force, inputPath };
}

function ensureLocalDirectories() {
  mkdirSync(FORM_SUBMISSION_DIR, { recursive: true });
  mkdirSync(REVIEWED_IMPORTS_DIR, { recursive: true });
  mkdirSync(REVIEW_OVERRIDES_DIR, { recursive: true });
}

function findNewestRawCsv() {
  const candidates = readdirSync(FORM_SUBMISSION_DIR).map((fileName) => {
    const path = join(FORM_SUBMISSION_DIR, fileName);
    return {
      mtimeMs: statSync(path).mtimeMs,
      path,
    };
  });

  return selectNewestCsv(candidates);
}

function getOutputPath(inputPath: string) {
  const parsed = parse(basename(inputPath));
  return join(REVIEWED_IMPORTS_DIR, `${parsed.name}.reviewed-draft.csv`);
}

const {
  dryRun,
  force,
  inputPath: requestedInputPath,
} = parseArgs(process.argv.slice(2));

try {
  ensureLocalDirectories();

  const inputPath = requestedInputPath ?? findNewestRawCsv();

  if (!inputPath) {
    printUsage();
    throw new Error(
      `No raw CSV export found in ${FORM_SUBMISSION_DIR}. Add a Google Forms CSV export or pass one explicitly.`,
    );
  }

  const outputPath = getOutputPath(inputPath);

  if (existsSync(outputPath) && !force) {
    throw new Error(
      `Reviewed draft already exists: ${outputPath}. Re-run with --force to overwrite it.`,
    );
  }

  const rawCsv = readFileSync(resolve(inputPath), "utf8");
  const overrideCsv = existsSync(REVIEW_OVERRIDES_PATH)
    ? readFileSync(REVIEW_OVERRIDES_PATH, "utf8")
    : undefined;
  const currentDataSet = loadDataSet();
  const result = processFormExportData({
    currentDataSet,
    overrideCsv,
    rawCsv,
    selectedInputPath: inputPath,
  });

  writeFileSync(outputPath, result.draftCsv);

  console.log(
    `Processed ${result.summary.rowsConverted} form response row(s) from ${inputPath}.`,
  );
  console.log(`Reviewed draft written to ${outputPath}.`);

  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (!result.canWrite || !result.updatedDataSet) {
    console.error("Production data was not changed.");

    for (const blocker of result.blockers) {
      console.error(`- ${blocker}`);
    }

    process.exitCode = 1;
  } else if (dryRun) {
    console.log("Dry run passed. Production data was not changed.");
  } else {
    writeFileSync(
      join(process.cwd(), "data", "shops.json"),
      `${JSON.stringify(result.updatedDataSet.shops, null, 2)}\n`,
    );
    writeFileSync(
      join(process.cwd(), "data", "price-records.csv"),
      formatPriceRecordsCsv(result.updatedDataSet.priceRecords),
    );
    console.log(
      "Production data updated: data/shops.json and data/price-records.csv.",
    );
  }
} catch (error) {
  console.error("Form export processing failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
}
