import { describe, expect, it } from "vitest";
import {
  convertGoogleFormResponsesToReviewedDraftCsv,
  FormResponseConversionError,
} from "./convert-form-responses";

const googleFormCsv = `Zeitstempel,Shop name,Observation date,Observed price in EUR,Product Type,Evidence/source type,confidence,Public source URL,Notes,Shop address,District or neighborhood
04.06.2026 12:47:33,Douran Döner,03.06.2026,7,Standard,In-store observation,,,,"Lipschitzallee 27, 12351 Berlin",Neukölln
04.06.2026 12:50:34,Döner 1,04.06.2026,"7,5",Standard,In-store observation,,,,"Bahnhofstr. 20, 12307 Berlin",Tempelhof-Schöneberg
`;

describe("Google Forms response converter", () => {
  it("converts current Google Forms responses to reviewed draft CSV", () => {
    const result = convertGoogleFormResponsesToReviewedDraftCsv(googleFormCsv);

    expect(result.summary.rowsConverted).toBe(2);
    expect(result.csv).toContain(
      "shopId,priceRecordId,shopName,address,district,borough,lat,lng,status,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes",
    );
    expect(result.csv).toContain(
      'douran-doener-neukoelln,price-douran-doener-neukoelln-2026-06-03-standard-doener,Douran Döner,"Lipschitzallee 27, 12351 Berlin",Neukölln,,,,unknown,2026-06-03,700,standard_doener,user_submission,65,,Draft from public form submission; verify before publication.',
    );
    expect(result.csv).toContain(
      'doener-1-tempelhof-schoeneberg,price-doener-1-tempelhof-schoeneberg-2026-06-04-standard-doener,Döner 1,"Bahnhofstr. 20, 12307 Berlin",Tempelhof-Schöneberg,,,,unknown,2026-06-04,750,standard_doener,user_submission,65,,Draft from public form submission; verify before publication.',
    );
    expect(result.warnings).toContain(
      "Draft rows still need maintainer review for borough, lat, lng, status, confidence, and public-safe notes before import.",
    );
  });

  it("leaves unsure districts blank and still uses postcode in draft ids", () => {
    const csv = googleFormCsv.replace("Neukölln", "Unsure / not listed");
    const result = convertGoogleFormResponsesToReviewedDraftCsv(csv);

    expect(result.csv).toContain(
      'douran-doener-12351,price-douran-doener-12351-2026-06-03-standard-doener,Douran Döner,"Lipschitzallee 27, 12351 Berlin",',
    );
  });

  it("makes duplicate draft ids unique", () => {
    const result = convertGoogleFormResponsesToReviewedDraftCsv(
      `${googleFormCsv}${googleFormCsv.split("\n")[1]}\n`,
    );

    expect(result.csv).toContain("douran-doener-neukoelln-2");
    expect(result.csv).toContain(
      "price-douran-doener-neukoelln-2-2026-06-03-standard-doener",
    );
  });

  it("rejects unsupported raw CSV headers", () => {
    expect(() =>
      convertGoogleFormResponsesToReviewedDraftCsv("Shop name\nDouran Döner\n"),
    ).toThrow(FormResponseConversionError);
  });
});
