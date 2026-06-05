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

function overrideCsvWithAction({
  action = "",
  status = "active",
  targetPriceRecordId = "",
  targetShopId = "",
}: {
  action?: string;
  status?: string;
  targetPriceRecordId?: string;
  targetShopId?: string;
}) {
  return `address,shopId,shopName,district,borough,lat,lng,status,confidence,sourceUrl,notes,approved,action,targetPriceRecordId,targetShopId
"Lipschitzallee 27, 12351 Berlin",douran-doener-neukoelln,Douran Döner,Neukölln,Neukölln,52.42658,13.45676,${status},65,,Reviewed public form submission; standard Doener price.,yes,${action},${targetPriceRecordId},${targetShopId}
`;
}

const existingShop = {
  address: "Lipschitzallee 27, 12351 Berlin",
  borough: "Neukölln",
  district: "Neukölln",
  id: "douran-doener-neukoelln",
  lat: 52.42658,
  lng: 13.45676,
  name: "Douran Döner",
  status: "active" as const,
};

const existingPriceRecord = {
  confidence: 65,
  id: "price-douran-doener-neukoelln-2026-06-03-standard-doener",
  notes: "Reviewed public form submission; standard Doener price.",
  observedAt: "2026-06-03",
  priceCents: 700,
  productType: "standard_doener" as const,
  shopId: "douran-doener-neukoelln",
  sourceType: "user_submission" as const,
  sourceUrl: undefined,
};

function dataSetWithExistingPrice(priceRecord = existingPriceRecord): DataSet {
  return {
    districts: [],
    priceRecords: [priceRecord],
    shops: [existingShop],
  };
}

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
      "Row 1 (Lipschitzallee 27, 12351 Berlin): missing required publication fields: borough, lat, lng. Open pnpm review:form-export, fill these fields in the local review page, save overrides, then rerun pnpm process:form-export --force.",
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
    expect(result.rowResults[0]?.classification).toBe(
      "existing_shop_new_price",
    );
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

  it("shows reviewed import dry-run details when final import validation fails", () => {
    const result = processFormExportData({
      currentDataSet: dataSetWithExistingPrice({
        ...existingPriceRecord,
        notes: "Existing record",
      }),
      overrideCsv: approvedOverrideCsv,
      rawCsv,
    });

    expect(result.canWrite).toBe(false);
    expect(result.blockers).toContain(
      'Row 1 (Lipschitzallee 27, 12351 Berlin): price record "price-douran-doener-neukoelln-2026-06-03-standard-doener" already exists with different reviewed fields. Use action=correct_price and targetPriceRecordId=price-douran-doener-neukoelln-2026-06-03-standard-doener if this is a correction.',
    );
    expect(result.rowResults[0]?.classification).toBe("possible_correction");
  });

  it("classifies an already imported row as a duplicate skip candidate", () => {
    const result = processFormExportData({
      currentDataSet: dataSetWithExistingPrice(),
      overrideCsv: approvedOverrideCsv,
      rawCsv,
    });

    expect(result.canWrite).toBe(false);
    expect(result.rowResults[0]?.classification).toBe("duplicate_price_record");
    expect(result.blockers).toContain(
      'Row 1 (Lipschitzallee 27, 12351 Berlin): price record "price-douran-doener-neukoelln-2026-06-03-standard-doener" already exists. Use action=skip to ignore it.',
    );
  });

  it("allows explicitly skipping an already imported row", () => {
    const result = processFormExportData({
      currentDataSet: dataSetWithExistingPrice(),
      overrideCsv: overrideCsvWithAction({ action: "skip" }),
      rawCsv,
    });

    expect(result.canWrite).toBe(true);
    expect(result.updatedDataSet?.priceRecords).toHaveLength(1);
    expect(result.rowResults[0]?.classification).toBe("skipped");
  });

  it("applies an explicit price correction against a target record", () => {
    const result = processFormExportData({
      currentDataSet: dataSetWithExistingPrice({
        ...existingPriceRecord,
        priceCents: 650,
      }),
      overrideCsv: overrideCsvWithAction({
        action: "correct_price",
        targetPriceRecordId:
          "price-douran-doener-neukoelln-2026-06-03-standard-doener",
      }),
      rawCsv,
    });

    expect(result.canWrite).toBe(true);
    expect(result.rowResults[0]?.classification).toBe("price_correction");
    expect(result.updatedDataSet?.priceRecords[0]?.priceCents).toBe(700);
  });

  it("blocks corrective actions without explicit target IDs", () => {
    const result = processFormExportData({
      currentDataSet: dataSetWithExistingPrice({
        ...existingPriceRecord,
        priceCents: 650,
      }),
      overrideCsv: overrideCsvWithAction({
        action: "correct_price",
      }),
      rawCsv,
    });

    expect(result.canWrite).toBe(false);
    expect(result.blockers).toContain(
      "Row 1 (Lipschitzallee 27, 12351 Berlin): correct_price requires targetPriceRecordId.",
    );
  });

  it("applies an explicit shop status update without appending a price", () => {
    const result = processFormExportData({
      currentDataSet: dataSetWithExistingPrice(),
      overrideCsv: overrideCsvWithAction({
        action: "update_shop",
        status: "closed",
        targetShopId: "douran-doener-neukoelln",
      }),
      rawCsv,
    });

    expect(result.canWrite).toBe(true);
    expect(result.rowResults[0]?.classification).toBe("shop_status_update");
    expect(result.updatedDataSet?.shops[0]?.status).toBe("closed");
    expect(result.updatedDataSet?.priceRecords).toHaveLength(1);
  });

  it("deletes a targeted price record only with an explicit action", () => {
    const result = processFormExportData({
      currentDataSet: dataSetWithExistingPrice(),
      overrideCsv: overrideCsvWithAction({
        action: "delete_price",
        targetPriceRecordId:
          "price-douran-doener-neukoelln-2026-06-03-standard-doener",
      }),
      rawCsv,
    });

    expect(result.canWrite).toBe(true);
    expect(result.rowResults[0]?.classification).toBe("price_delete");
    expect(result.updatedDataSet?.priceRecords).toHaveLength(0);
  });
});
