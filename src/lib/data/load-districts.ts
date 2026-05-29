import { type District, districtsSchema } from "../validation/schemas";
import { readDataFile } from "./read-data-file";

export function parseDistrictsJson(input: string): District[] {
  return districtsSchema.parse(JSON.parse(input));
}

export function loadDistricts(dataDirectory?: string): District[] {
  return parseDistrictsJson(readDataFile("districts.json", dataDirectory));
}
