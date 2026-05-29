import { ZodError } from "zod";
import { loadDataSet } from "../src/lib/data/load-data";
import { validateDataSet } from "../src/lib/validation/validate-data";

function printMessages(
  label: string,
  messages: { path: string; code: string; message: string }[],
) {
  if (messages.length === 0) {
    return;
  }

  console.log(`\n${label}:`);

  for (const message of messages) {
    console.log(`- ${message.path} [${message.code}]: ${message.message}`);
  }
}

try {
  const dataSet = loadDataSet();
  const result = validateDataSet(dataSet);

  printMessages("Warnings", result.warnings);
  printMessages("Errors", result.errors);

  if (result.errors.length > 0) {
    console.error(
      `\nData validation failed with ${result.errors.length} error(s).`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Data validation passed: ${dataSet.shops.length} shops, ${dataSet.priceRecords.length} price records, ${dataSet.districts.length} districts.`,
    );
  }
} catch (error) {
  console.error("Data loading failed.");

  if (error instanceof ZodError) {
    for (const issue of error.issues) {
      console.error(`- ${issue.path.join(".") || "<root>"}: ${issue.message}`);
    }
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
}
