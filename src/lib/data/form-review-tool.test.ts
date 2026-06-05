import { describe, expect, it } from "vitest";
import {
  buildReviewToolState,
  formatOverrideRows,
  isAuthorizedReviewRequest,
  parseReviewToolArgs,
  resolveReviewToolInputPath,
  runReviewToolPipeline,
} from "./form-review-tool";
import type { DataSet } from "./load-data";

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

describe("local form review tool helpers", () => {
  it("selects the newest raw CSV unless an explicit path is provided", () => {
    const candidates = [
      { mtimeMs: 10, path: "dev_locals/data/form-submission/old.csv" },
      { mtimeMs: 20, path: "dev_locals/data/form-submission/new.csv" },
    ];

    expect(resolveReviewToolInputPath({ candidates })).toBe(
      "dev_locals/data/form-submission/new.csv",
    );
    expect(
      resolveReviewToolInputPath({
        candidates,
        requestedInputPath: "custom.csv",
      }),
    ).toBe("custom.csv");
  });

  it("parses local CLI args and refuses non-loopback hosts", () => {
    expect(
      parseReviewToolArgs([
        "dev_locals/data/form-submission/current.csv",
        "--port",
        "4318",
      ]),
    ).toEqual({
      host: "127.0.0.1",
      inputPath: "dev_locals/data/form-submission/current.csv",
      port: 4318,
    });

    expect(() => parseReviewToolArgs(["--host", "0.0.0.0"])).toThrow(
      /loopback host/,
    );
  });

  it("formats saved overrides with the canonical header", () => {
    expect(
      formatOverrideRows([
        {
          address: "Lipschitzallee 27, 12351 Berlin",
          approved: "yes",
          action: "",
          borough: "Neukölln",
          confidence: "65",
          district: "Neukölln",
          lat: "52.42658",
          lng: "13.45676",
          notes: "Reviewed",
          shopId: "douran-doener-neukoelln",
          shopName: "Douran Döner",
          sourceUrl: "",
          status: "active",
          targetPriceRecordId: "",
          targetShopId: "",
        },
      ]),
    ).toBe(
      'address,shopId,shopName,district,borough,lat,lng,status,confidence,sourceUrl,notes,approved,action,targetPriceRecordId,targetShopId\n"Lipschitzallee 27, 12351 Berlin",douran-doener-neukoelln,Douran Döner,Neukölln,Neukölln,52.42658,13.45676,active,65,,Reviewed,yes,,,\n',
    );
  });

  it("builds review state with raw, reviewed, and editable override rows", () => {
    const state = buildReviewToolState({
      currentDataSet: emptyDataSet,
      rawCsv,
      selectedInputPath: "dev_locals/data/form-submission/current.csv",
    });

    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]?.raw["Shop name"]).toBe("Douran Döner");
    expect(state.rows[0]?.reviewed.shopId).toBe("douran-doener-neukoelln");
    expect(state.rows[0]?.override.confidence).toBe("65");
    expect(state.result.canWrite).toBe(false);
  });

  it("refuses final import when process blockers remain", () => {
    const result = runReviewToolPipeline({
      currentDataSet: emptyDataSet,
      rawCsv,
      writeRequested: true,
    });

    expect(result.wroteProduction).toBe(false);
    expect(result.dataSetToWrite).toBeUndefined();
    expect(result.state.result.blockers).toContain(
      "Row 1 (Lipschitzallee 27, 12351 Berlin): complete borough, lat, lng.",
    );
  });

  it("returns writable data only when approved overrides satisfy dry-run gates", () => {
    const result = runReviewToolPipeline({
      currentDataSet: emptyDataSet,
      overrideCsv: approvedOverrideCsv,
      rawCsv,
      writeRequested: true,
    });

    expect(result.wroteProduction).toBe(true);
    expect(result.dataSetToWrite?.shops[0]?.id).toBe("douran-doener-neukoelln");
  });

  it("requires the one-time token for local API requests", () => {
    const token = "secret-token";
    const url = new URL("http://127.0.0.1:4317/api/state");

    expect(
      isAuthorizedReviewRequest({
        headers: { "x-review-token": token },
        token,
        url,
      }),
    ).toBe(true);
    expect(
      isAuthorizedReviewRequest({
        headers: {},
        token,
        url,
      }),
    ).toBe(false);

    url.searchParams.set("token", token);
    expect(
      isAuthorizedReviewRequest({
        headers: {},
        token,
        url,
      }),
    ).toBe(true);
  });
});
