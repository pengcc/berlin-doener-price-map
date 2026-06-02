const GITHUB_ISSUE_BASE_URL =
  "https://github.com/pengcc/berlin-doener-price-map/issues/new";

export const PRICE_OBSERVATION_TEMPLATE = "01-price-observation.yml";
export const DATA_CORRECTION_TEMPLATE = "02-data-correction.yml";
export const BULK_PRICE_OBSERVATIONS_TEMPLATE =
  "03-bulk-price-observations.yml";

type ContributionEnvironment = Record<string, string | undefined> & {
  DOENER_CORRECTION_EMAIL?: string;
  DOENER_CORRECTION_URL?: string;
  DOENER_PRICE_FORM_URL?: string;
};

export type CorrectionContact = {
  href: string;
  kind: "email" | "url";
};

export type ContributionConfig = {
  githubBulkPriceObservationsUrl: string;
  correctionContact?: CorrectionContact;
  githubCorrectionIssueUrl: string;
  githubPriceObservationUrl: string;
  priceFormUrl?: string;
};

function optionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getGitHubIssueFormUrl(template: string) {
  const url = new URL(GITHUB_ISSUE_BASE_URL);
  url.searchParams.set("template", template);
  return url.toString();
}

function getCorrectionEmailHref(email: string) {
  const params = new URLSearchParams({
    subject: "Berlin Doener Price Map correction",
  });

  return `mailto:${email}?${params.toString()}`;
}

export function getContributionConfig(
  env: ContributionEnvironment = process.env,
): ContributionConfig {
  const correctionUrl = optionalValue(env.DOENER_CORRECTION_URL);
  const correctionEmail = optionalValue(env.DOENER_CORRECTION_EMAIL);
  const priceFormUrl = optionalValue(env.DOENER_PRICE_FORM_URL);

  return {
    correctionContact: correctionUrl
      ? { href: correctionUrl, kind: "url" }
      : correctionEmail
        ? { href: getCorrectionEmailHref(correctionEmail), kind: "email" }
        : undefined,
    githubBulkPriceObservationsUrl: getGitHubIssueFormUrl(
      BULK_PRICE_OBSERVATIONS_TEMPLATE,
    ),
    githubCorrectionIssueUrl: getGitHubIssueFormUrl(DATA_CORRECTION_TEMPLATE),
    githubPriceObservationUrl: getGitHubIssueFormUrl(
      PRICE_OBSERVATION_TEMPLATE,
    ),
    priceFormUrl,
  };
}
