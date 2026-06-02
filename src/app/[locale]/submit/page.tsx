import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import {
  type ContributionCard,
  ContributionOptions,
} from "@/components/contribution/contribution-options";
import { PriceIntakeTable } from "@/components/contribution/price-intake-table";
import type { Locale } from "@/i18n/routing";
import { getContributionConfig } from "@/lib/contribution/contribution-config";
import { productTypes, sourceTypes } from "@/lib/validation/options";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function SubmitPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dataMode = "production";
  const t = await getTranslations({ locale, namespace: "SubmitPage" });
  const labels = await getTranslations({ locale, namespace: "Labels" });
  const contributionConfig = getContributionConfig();
  const productLabels = Object.fromEntries(
    productTypes.map((productType) => [
      productType,
      labels(`productTypes.${productType}`),
    ]),
  );
  const sourceLabels = Object.fromEntries(
    sourceTypes.map((sourceType) => [
      sourceType,
      labels(`sourceTypes.${sourceType}`),
    ]),
  );
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

      <PriceIntakeTable
        bulkIssueUrl={contributionConfig.githubBulkPriceObservationsUrl}
        productLabels={productLabels}
        sourceLabels={sourceLabels}
        text={{
          addRow: t("intake.addRow"),
          copyMarkdown: t("intake.copyMarkdown"),
          copied: t("intake.copied"),
          downloadCsv: t("intake.downloadCsv"),
          errors: {
            invalid_date: t("intake.errors.invalidDate"),
            invalid_price: t("intake.errors.invalidPrice"),
            invalid_product_type: t("intake.errors.invalidProductType"),
            invalid_source_type: t("intake.errors.invalidSourceType"),
            invalid_url: t("intake.errors.invalidUrl"),
            required: t("intake.errors.required"),
          },
          fields: {
            district: t("intake.fields.district"),
            notes: t("intake.fields.notes"),
            observedAt: t("intake.fields.observedAt"),
            priceEuro: t("intake.fields.priceEuro"),
            productType: t("intake.fields.productType"),
            shopAddress: t("intake.fields.shopAddress"),
            shopName: t("intake.fields.shopName"),
            sourceContext: t("intake.fields.sourceContext"),
            sourceType: t("intake.fields.sourceType"),
            sourceUrl: t("intake.fields.sourceUrl"),
          },
          generate: t("intake.generate"),
          intro: t("intake.intro"),
          manualReview: t("intake.manualReview"),
          openIssue: t("intake.openIssue"),
          outputLabel: t("intake.outputLabel"),
          removeRow: t("intake.removeRow"),
          rowHeader: t("intake.rowHeader"),
          rowLabel: t("intake.rowLabel"),
          statusInvalid: t("intake.statusInvalid"),
          statusValid: t("intake.statusValid"),
          title: t("intake.title"),
        }}
      />

      <ContributionOptions cards={cards} reviewNotice={t("reviewNotice")} />
    </AppShell>
  );
}
