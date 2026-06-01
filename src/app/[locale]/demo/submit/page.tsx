import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import {
  type ContributionCard,
  ContributionOptions,
} from "@/components/contribution/contribution-options";
import type { Locale } from "@/i18n/routing";
import { getContributionConfig } from "@/lib/contribution/contribution-config";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function DemoSubmitPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dataMode = "demo";
  const t = await getTranslations({ locale, namespace: "SubmitPage" });
  const contributionConfig = getContributionConfig();
  const cards: ContributionCard[] = [
    {
      actionLabel: t("form.link"),
      body: contributionConfig.priceFormUrl
        ? t("form.bodyAvailable")
        : t("form.bodyUnavailable"),
      disabledLabel: t("form.disabled"),
      href: contributionConfig.priceFormUrl,
      status: contributionConfig.priceFormUrl
        ? t("form.statusAvailable")
        : t("form.statusUnavailable"),
      title: t("form.title"),
    },
    {
      actionLabel: t("github.link"),
      body: t("github.body"),
      href: contributionConfig.githubPriceObservationUrl,
      status: t("github.status"),
      title: t("github.title"),
    },
    {
      actionLabel: contributionConfig.correctionContact
        ? t("corrections.linkContact")
        : t("corrections.linkGithub"),
      body: contributionConfig.correctionContact
        ? t("corrections.bodyContact")
        : t("corrections.bodyGithub"),
      href:
        contributionConfig.correctionContact?.href ??
        contributionConfig.githubCorrectionIssueUrl,
      status: contributionConfig.correctionContact
        ? t("corrections.statusContact")
        : t("corrections.statusGithub"),
      title: t("corrections.title"),
    },
  ];

  return (
    <AppShell activeHref="/submit" dataMode={dataMode} locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      <ContributionOptions cards={cards} reviewNotice={t("reviewNotice")} />
    </AppShell>
  );
}
