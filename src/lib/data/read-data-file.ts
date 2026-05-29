import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DATA_DIRECTORY = "data";

export function getDataPath(filename: string, dataDirectory = DATA_DIRECTORY) {
  return join(process.cwd(), dataDirectory, filename);
}

export function readDataFile(filename: string, dataDirectory = DATA_DIRECTORY) {
  return readFileSync(getDataPath(filename, dataDirectory), "utf8");
}
