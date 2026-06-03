import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { ContributionOptions } from "@/components/contribution/contribution-options";
import type { Locale } from "@/i18n/routing";
import { getContributionCards } from "@/lib/contribution/contribution-cards";
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
  const cards = getContributionCards(contributionConfig, {
    corrections: {
      bodyContact: t("corrections.bodyContact"),
      bodyGithub: t("corrections.bodyGithub"),
      linkContact: t("corrections.linkContact"),
      linkGithub: t("corrections.linkGithub"),
      statusContact: t("corrections.statusContact"),
      statusGithub: t("corrections.statusGithub"),
      title: t("corrections.title"),
    },
    form: {
      bodyAvailable: t("form.bodyAvailable"),
      link: t("form.link"),
      statusAvailable: t("form.statusAvailable"),
      title: t("form.title"),
    },
    github: {
      body: t("github.body"),
      link: t("github.link"),
      status: t("github.status"),
      title: t("github.title"),
    },
  });

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
