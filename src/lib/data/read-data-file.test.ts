import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDataPath } from "./read-data-file";

describe("getDataPath", () => {
  it("resolves supported production data files under the data directory", () => {
    expect(getDataPath("shops.json")).toBe(
      join(process.cwd(), "data", "shops.json"),
    );
  });

  it("resolves supported demo data files under the demo data directory", () => {
    expect(getDataPath("price-records.csv", "data/demo")).toBe(
      join(process.cwd(), "data", "demo", "price-records.csv"),
    );
  });

  it("rejects unsupported data paths", () => {
    expect(() => getDataPath("package.json")).toThrow(/Unsupported data file/);
    expect(() => getDataPath("shops.json", ".")).toThrow(
      /Unsupported data directory/,
    );
  });
});
