import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  convertGoogleFormResponsesToReviewedDraftCsv,
  FormResponseConversionError,
} from "../src/lib/data/convert-form-responses";

type Args = {
  force: boolean;
  inputPath: string | undefined;
  outputPath: string | undefined;
};

function printUsage() {
  console.log(
    "Usage: pnpm convert:form-responses -- <google-form-responses.csv> <reviewed-draft.csv> [--force]",
  );
}

function parseArgs(args: string[]): Args {
  const paths: string[] = [];
  let force = false;

  for (const arg of args) {
    if (arg === "--") {
      continue;
    }

    if (arg === "--force") {
      force = true;
      continue;
    }

    paths.push(arg);
  }

  return {
    force,
    inputPath: paths[0],
    outputPath: paths[1],
  };
}

const { force, inputPath, outputPath } = parseArgs(process.argv.slice(2));

if (!inputPath || !outputPath) {
  printUsage();
  process.exitCode = 1;
} else {
  try {
    const resolvedInputPath = resolve(inputPath);
    const resolvedOutputPath = resolve(outputPath);

    if (existsSync(resolvedOutputPath) && !force) {
      throw new Error(
        `Output file already exists: ${outputPath}. Re-run with --force to overwrite it.`,
      );
    }

    const rawCsv = readFileSync(resolvedInputPath, "utf8");
    const result = convertGoogleFormResponsesToReviewedDraftCsv(rawCsv);

    mkdirSync(dirname(resolvedOutputPath), { recursive: true });
    writeFileSync(resolvedOutputPath, result.csv);

    console.log(
      `Converted ${result.summary.rowsConverted} form response row(s) to reviewed draft CSV: ${outputPath}`,
    );

    for (const warning of result.warnings) {
      console.warn(`Warning: ${warning}`);
    }
  } catch (error) {
    console.error("Form response conversion failed.");

    if (error instanceof FormResponseConversionError) {
      for (const message of error.errors) {
        console.error(`- ${message}`);
      }
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  }
}
