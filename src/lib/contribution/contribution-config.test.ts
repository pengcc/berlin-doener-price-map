import { describe, expect, it } from "vitest";
import {
  BULK_PRICE_OBSERVATIONS_TEMPLATE,
  DATA_CORRECTION_TEMPLATE,
  getContributionConfig,
  getGitHubIssueFormUrl,
  PRICE_OBSERVATION_TEMPLATE,
} from "./contribution-config";

describe("contribution config", () => {
  it("uses GitHub issue forms when no external env is configured", () => {
    expect(getContributionConfig({})).toEqual({
      githubBulkPriceObservationsUrl: getGitHubIssueFormUrl(
        BULK_PRICE_OBSERVATIONS_TEMPLATE,
      ),
      githubCorrectionIssueUrl: getGitHubIssueFormUrl(DATA_CORRECTION_TEMPLATE),
      githubPriceObservationUrl: getGitHubIssueFormUrl(
        PRICE_OBSERVATION_TEMPLATE,
      ),
      priceFormUrl: undefined,
    });
  });

  it("uses an optional external public form URL", () => {
    expect(
      getContributionConfig({
        DOENER_PRICE_FORM_URL: " https://example.com/form ",
      }).priceFormUrl,
    ).toBe("https://example.com/form");
  });

  it("uses an optional correction email as a mailto link", () => {
    expect(
      getContributionConfig({
        DOENER_CORRECTION_EMAIL: " corrections@example.com ",
      }).correctionContact,
    ).toEqual({
      href: "mailto:corrections@example.com?subject=Berlin+Doener+Price+Map+correction",
      kind: "email",
    });
  });

  it("prefers a correction URL over a correction email", () => {
    expect(
      getContributionConfig({
        DOENER_CORRECTION_EMAIL: "corrections@example.com",
        DOENER_CORRECTION_URL: "https://example.com/corrections",
      }).correctionContact,
    ).toEqual({
      href: "https://example.com/corrections",
      kind: "url",
    });
  });

  it("builds stable GitHub issue form URLs", () => {
    expect(getGitHubIssueFormUrl(PRICE_OBSERVATION_TEMPLATE)).toBe(
      "https://github.com/pengcc/berlin-doener-price-map/issues/new?template=01-price-observation.yml",
    );
    expect(getGitHubIssueFormUrl(DATA_CORRECTION_TEMPLATE)).toBe(
      "https://github.com/pengcc/berlin-doener-price-map/issues/new?template=02-data-correction.yml",
    );
    expect(getGitHubIssueFormUrl(BULK_PRICE_OBSERVATIONS_TEMPLATE)).toBe(
      "https://github.com/pengcc/berlin-doener-price-map/issues/new?template=03-bulk-price-observations.yml",
    );
  });
});
