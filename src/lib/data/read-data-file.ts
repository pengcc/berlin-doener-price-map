import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DATA_DIRECTORY = "data";
export const DEMO_DATA_DIRECTORY = "data/demo";
const DATA_FILENAMES = new Set([
  "districts.json",
  "price-records.csv",
  "shops.json",
]);

function assertDataFilename(filename: string) {
  if (!DATA_FILENAMES.has(filename)) {
    throw new Error(`Unsupported data file: ${filename}`);
  }
}

export function getDataPath(filename: string, dataDirectory = DATA_DIRECTORY) {
  assertDataFilename(filename);

  if (dataDirectory === DATA_DIRECTORY) {
    return join(process.cwd(), "data", filename);
  }

  if (dataDirectory === DEMO_DATA_DIRECTORY) {
    return join(process.cwd(), "data", "demo", filename);
  }

  throw new Error(`Unsupported data directory: ${dataDirectory}`);
}

export function readDataFile(filename: string, dataDirectory = DATA_DIRECTORY) {
  return readFileSync(getDataPath(filename, dataDirectory), "utf8");
}
