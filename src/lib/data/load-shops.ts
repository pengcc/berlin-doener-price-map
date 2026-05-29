import { type Shop, shopsSchema } from "../validation/schemas";
import { readDataFile } from "./read-data-file";

export function parseShopsJson(input: string): Shop[] {
  return shopsSchema.parse(JSON.parse(input));
}

export function loadShops(dataDirectory?: string): Shop[] {
  return parseShopsJson(readDataFile("shops.json", dataDirectory));
}
