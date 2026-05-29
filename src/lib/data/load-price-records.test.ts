import { describe, expect, it } from "vitest";
import {
  PRICE_RECORD_HEADERS,
  parsePriceRecordsCsv,
} from "./load-price-records";

describe("parsePriceRecordsCsv", () => {
  it("accepts a header-only CSV as an empty dataset", () => {
    expect(parsePriceRecordsCsv(PRICE_RECORD_HEADERS.join(","))).toEqual([]);
  });

  it("parses quoted CSV rows and coerces numeric fields", () => {
    const csv = `${PRICE_RECORD_HEADERS.join(",")}
price-001,example-doener-kreuzberg,2026-05-20,700,standard_doener,user_submission,65,,"Seen on menu, cash only"`;

    expect(parsePriceRecordsCsv(csv)).toEqual([
      {
        id: "price-001",
        shopId: "example-doener-kreuzberg",
        observedAt: "2026-05-20",
        priceCents: 700,
        productType: "standard_doener",
        sourceType: "user_submission",
        confidence: 65,
        sourceUrl: undefined,
        notes: "Seen on menu, cash only",
      },
    ]);
  });

  it("rejects a non-canonical header", () => {
    expect(() => parsePriceRecordsCsv("id,shopId,priceCents")).toThrow(
      /must use 9 columns/,
    );
  });
});
