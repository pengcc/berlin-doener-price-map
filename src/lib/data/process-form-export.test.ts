import { describe, expect, it } from "vitest";
import type { DataSet } from "./load-data";
import {
  normalizeAddressForReview,
  processFormExportData,
  selectNewestCsv,
} from "./process-form-export";

const emptyDataSet: DataSet = {
  districts: [],
  priceRecords: [],
  shops: [],
};

const rawCsv = `Zeitstempel,Shop name,Observation date,Observed price in EUR,Product Type,Evidence/source type,confidence,Public source URL,Notes,Shop address,District or neighborhood
04.06.2026 12:47:33,Douran Döner,03.06.2026,7,Standard,In-store observation,,,,"Lipschitzallee 27, 12351 Berlin",Neukölln
`;

const approvedOverrideCsv = `address,shopId,shopName,district,borough,lat,lng,status,confidence,sourceUrl,notes,approved
"Lipschitzallee 27, 12351 Berlin",douran-doener-neukoelln,Douran Döner,Neukölln,Neukölln,52.42658,13.45676,active,65,,Reviewed public form submission; standard Doener price.,yes
`;

describe("process form export", () => {
  it("selects the newest CSV candidate", () => {
    expect(
      selectNewestCsv([
        { mtimeMs: 10, path: "dev_locals/data/form-submission/old.csv" },
        { mtimeMs: 20, path: "dev_locals/data/form-submission/new.csv" },
        { mtimeMs: 30, path: "dev_locals/data/form-submission/readme.txt" },
      ]),
    ).toBe("dev_locals/data/form-submission/new.csv");
  });

  it("normalizes addresses for matching", () => {
    expect(normalizeAddressForReview("  Hauptstraße  1 ,  10115 Berlin ")).toBe(
      "hauptstrasse 1, 10115 berlin",
    );
  });

  it("blocks automatic write when required publication fields are missing", () => {
    const result = processFormExportData({
      currentDataSet: emptyDataSet,
      rawCsv,
    });

    expect(result.canWrite).toBe(false);
    expect(result.blockers).toContain(
      "Row 1 (Lipschitzallee 27, 12351 Berlin): complete borough, lat, lng.",
    );
    expect(result.draftCsv).toContain("douran-doener-neukoelln");
  });

  it("blocks automatic write when a new-shop override is not approved", () => {
    const result = processFormExportData({
      currentDataSet: emptyDataSet,
      overrideCsv: approvedOverrideCsv.replace(",yes", ",no"),
      rawCsv,
    });

    expect(result.canWrite).toBe(false);
    expect(result.blockers).toContain(
      "Row 1 (Lipschitzallee 27, 12351 Berlin): override row must have approved=yes before automatic write.",
    );
  });

  it("reuses existing production shop metadata by address", () => {
    const dataSet: DataSet = {
      ...emptyDataSet,
      shops: [
        {
          address: "Lipschitzallee 27, 12351 Berlin",
          borough: "Neukölln",
          district: "Neukölln",
          id: "existing-douran-neukoelln",
          lat: 52.42658,
          lng: 13.45676,
          name: "Douran Döner",
          status: "active",
        },
      ],
    };
    const result = processFormExportData({
      currentDataSet: dataSet,
      rawCsv,
    });

    expect(result.canWrite).toBe(true);
    expect(result.draftCsv).toContain("existing-douran-neukoelln");
    expect(result.updatedDataSet?.priceRecords).toHaveLength(1);
  });

  it("returns updated data only after overrides complete the reviewed import", () => {
    const result = processFormExportData({
      currentDataSet: emptyDataSet,
      overrideCsv: approvedOverrideCsv,
      rawCsv,
    });

    expect(result.canWrite).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.updatedDataSet?.shops[0]?.borough).toBe("Neukölln");
    expect(result.updatedDataSet?.priceRecords[0]?.priceCents).toBe(700);
  });
});
