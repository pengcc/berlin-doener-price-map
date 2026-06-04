import { describe, expect, it } from "vitest";
import { parseReviewedDataImportArgs } from "./import-reviewed-data-cli";

describe("reviewed data import CLI args", () => {
  it("accepts an input path without an argument separator", () => {
    expect(parseReviewedDataImportArgs(["reviewed-data.csv"])).toEqual({
      inputPath: "reviewed-data.csv",
      write: false,
    });
  });

  it("accepts an input path after the pnpm argument separator", () => {
    expect(parseReviewedDataImportArgs(["--", "reviewed-data.csv"])).toEqual({
      inputPath: "reviewed-data.csv",
      write: false,
    });
  });

  it("preserves the write flag with or without an argument separator", () => {
    expect(
      parseReviewedDataImportArgs(["--", "reviewed-data.csv", "--write"]),
    ).toEqual({
      inputPath: "reviewed-data.csv",
      write: true,
    });

    expect(
      parseReviewedDataImportArgs(["reviewed-data.csv", "--write"]),
    ).toEqual({
      inputPath: "reviewed-data.csv",
      write: true,
    });
  });

  it("returns no input path when only flags are provided", () => {
    expect(parseReviewedDataImportArgs(["--", "--write"])).toEqual({
      inputPath: undefined,
      write: true,
    });
  });
});
