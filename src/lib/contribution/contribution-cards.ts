import type { ContributionConfig } from "./contribution-config";

export type ContributionCard = {
  actionLabel?: string;
  body: string;
  disabledLabel?: string;
  href?: string;
  status: string;
  title: string;
};

type ContributionCardsText = {
  corrections: {
    bodyContact: string;
    bodyGithub: string;
    linkContact: string;
    linkGithub: string;
    statusContact: string;
    statusGithub: string;
    title: string;
  };
  form: {
    bodyAvailable: string;
    link: string;
    statusAvailable: string;
    title: string;
  };
  github: {
    body: string;
    link: string;
    status: string;
    title: string;
  };
};

export function getContributionCards(
  contributionConfig: ContributionConfig,
  text: ContributionCardsText,
): ContributionCard[] {
  const cards: ContributionCard[] = [];

  if (contributionConfig.priceFormUrl) {
    cards.push({
      actionLabel: text.form.link,
      body: text.form.bodyAvailable,
      href: contributionConfig.priceFormUrl,
      status: text.form.statusAvailable,
      title: text.form.title,
    });
  }

  cards.push(
    {
      actionLabel: text.github.link,
      body: text.github.body,
      href: contributionConfig.githubPriceObservationUrl,
      status: text.github.status,
      title: text.github.title,
    },
    {
      actionLabel: contributionConfig.correctionContact
        ? text.corrections.linkContact
        : text.corrections.linkGithub,
      body: contributionConfig.correctionContact
        ? text.corrections.bodyContact
        : text.corrections.bodyGithub,
      href:
        contributionConfig.correctionContact?.href ??
        contributionConfig.githubCorrectionIssueUrl,
      status: contributionConfig.correctionContact
        ? text.corrections.statusContact
        : text.corrections.statusGithub,
      title: text.corrections.title,
    },
  );

  return cards;
}
