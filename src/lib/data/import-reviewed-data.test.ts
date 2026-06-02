import { describe, expect, it } from "vitest";
import {
  formatPriceRecordsCsv,
  importReviewedData,
  ReviewedDataImportError,
} from "./import-reviewed-data";
import type { DataSet } from "./load-data";

const emptyDataSet: DataSet = {
  districts: [],
  priceRecords: [],
  shops: [],
};

const reviewedCsv = `shopId,priceRecordId,shopName,address,district,borough,lat,lng,status,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
ruyada-schoeneberg,price-ruyada-2026-06-01,Ruyada Gemüse Kebab,Hauptstrasse 133 10827 Berlin,Schöneberg,Tempelhof-Schöneberg,52.4867,13.3519,active,2026-06-01,700,standard_doener,manual_observation,85,,Reviewed from counter menu
`;

describe("reviewed data import", () => {
  it("imports reviewed rows into production data structures", () => {
    const result = importReviewedData(emptyDataSet, reviewedCsv);

    expect(result.summary).toEqual({
      newPriceRecords: 1,
      newShops: 1,
      reviewedRows: 1,
    });
    expect(result.dataSet.shops[0]?.id).toBe("ruyada-schoeneberg");
    expect(result.dataSet.priceRecords[0]?.priceCents).toBe(700);
  });

  it("rejects duplicate price record ids", () => {
    const currentDataSet = importReviewedData(
      emptyDataSet,
      reviewedCsv,
    ).dataSet;

    expect(() => importReviewedData(currentDataSet, reviewedCsv)).toThrow(
      ReviewedDataImportError,
    );
  });

  it("rejects conflicting existing shop metadata", () => {
    const conflictingCsv = reviewedCsv.replace("52.4867", "52.4001");
    const currentDataSet = importReviewedData(
      emptyDataSet,
      reviewedCsv,
    ).dataSet;

    expect(() => importReviewedData(currentDataSet, conflictingCsv)).toThrow(
      ReviewedDataImportError,
    );
  });

  it("rejects missing publication-ready fields", () => {
    const invalidCsv = reviewedCsv.replace("52.4867", "");

    expect(() => importReviewedData(emptyDataSet, invalidCsv)).toThrow();
  });

  it("formats price records as canonical CSV", () => {
    const result = importReviewedData(emptyDataSet, reviewedCsv);

    expect(formatPriceRecordsCsv(result.dataSet.priceRecords)).toBe(
      "id,shopId,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes\nprice-ruyada-2026-06-01,ruyada-schoeneberg,2026-06-01,700,standard_doener,manual_observation,85,,Reviewed from counter menu\n",
    );
  });
});
