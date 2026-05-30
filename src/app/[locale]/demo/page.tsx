import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { MetricGrid } from "@/components/data/metric-grid";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { calculateDistrictStats } from "@/lib/data/calculate-district-stats";
import { getPathForDataMode, loadAppDataSet } from "@/lib/data/data-source";
import { getDataSummary } from "@/lib/data/get-data-summary";
import { getPriceRankings } from "@/lib/data/get-rankings";
import { formatCurrency, formatDate, formatInteger } from "@/lib/i18n/format";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function DemoHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dataMode = "demo";
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const common = await getTranslations({ locale, namespace: "Common" });
  const { dataSet } = loadAppDataSet(dataMode);
  const summary = getDataSummary(dataSet);
  const rankings = getPriceRankings(dataSet, { limit: 3 });
  const districtStats = calculateDistrictStats(dataSet).slice(0, 4);
  const hasCurrentPrices = summary.currentPriceCount > 0;

  const metrics = [
    {
      label: t("metrics.currentPrices"),
      value: formatInteger(summary.currentPriceCount, locale),
    },
    {
      label: t("metrics.activeShops"),
      value: formatInteger(summary.activeShopCount, locale),
    },
    {
      label: t("metrics.averagePrice"),
      value:
        summary.averagePriceCents === undefined
          ? common("emptyValue")
          : formatCurrency(summary.averagePriceCents, locale),
    },
    {
      label: t("metrics.lastUpdated"),
      value: summary.lastUpdatedAt
        ? formatDate(summary.lastUpdatedAt, locale)
        : common("emptyValue"),
    },
  ];

  return (
    <AppShell activeHref="/" dataMode={dataMode} locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      <MetricGrid metrics={metrics} />

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-neutral-900/10 bg-white p-5">
          <div className="flex flex-col gap-2 border-neutral-900/10 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-2xl">
                {t("pricePreview.title")}
              </h2>
              <p className="mt-1 text-neutral-600 text-sm">
                {t("pricePreview.meta", {
                  count: formatInteger(rankings.sampleCount, locale),
                })}
              </p>
            </div>
            <Link
              className="font-medium text-emerald-700 text-sm hover:text-emerald-900"
              href={getPathForDataMode("/ranking", dataMode)}
              locale={locale}
            >
              {t("pricePreview.link")}
            </Link>
          </div>

          {hasCurrentPrices ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {rankings.cheapest.slice(0, 2).map((price) => (
                <div
                  className="border border-neutral-900/10 p-4"
                  key={price.id}
                >
                  <p className="text-neutral-500 text-sm">
                    {price.shop.district}
                  </p>
                  <p className="mt-1 font-medium">
                    {price.shop.name ?? price.shop.address}
                  </p>
                  <p className="mt-3 font-semibold text-2xl">
                    {formatCurrency(price.priceCents, locale)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                body={t("pricePreview.emptyBody")}
                title={t("pricePreview.emptyTitle")}
              />
            </div>
          )}
        </div>

        <div className="border border-neutral-900/10 bg-white p-5">
          <h2 className="font-semibold text-2xl">{t("mapPreview.title")}</h2>
          <div className="mt-4 flex min-h-56 flex-col items-center justify-center gap-4 border border-neutral-900/10 bg-[#dde8df] p-6 text-center">
            <p className="max-w-sm text-neutral-700 text-sm leading-6">
              {t("mapPreview.body")}
            </p>
            <Link
              className="inline-flex min-h-10 items-center bg-neutral-950 px-4 font-medium text-sm text-white"
              href={getPathForDataMode("/map", dataMode)}
              locale={locale}
            >
              {t("mapPreview.link")}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="border border-neutral-900/10 bg-white p-5">
          <h2 className="font-semibold text-2xl">
            {t("districtPreview.title")}
          </h2>
          {districtStats.length > 0 ? (
            <ul className="mt-4 divide-y divide-neutral-900/10">
              {districtStats.map((district) => (
                <li
                  className="flex items-center justify-between gap-4 py-3"
                  key={district.district}
                >
                  <div>
                    <p className="font-medium">{district.district}</p>
                    <p className="text-neutral-500 text-sm">
                      {t("districtPreview.samples", {
                        count: formatInteger(district.sampleCount, locale),
                      })}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(district.averagePriceCents, locale)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                body={t("districtPreview.emptyBody")}
                title={t("districtPreview.emptyTitle")}
              />
            </div>
          )}
        </div>

        <div className="border border-neutral-900/10 bg-white p-5">
          <h2 className="font-semibold text-2xl">{t("contribute.title")}</h2>
          <p className="mt-3 text-neutral-700 text-sm leading-6">
            {t("contribute.body")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center bg-neutral-950 px-4 font-medium text-sm text-white"
              href={getPathForDataMode("/submit", dataMode)}
              locale={locale}
            >
              {t("contribute.submitLink")}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center border border-neutral-900/15 bg-white px-4 font-medium text-neutral-800 text-sm"
              href={getPathForDataMode("/methodology", dataMode)}
              locale={locale}
            >
              {t("contribute.methodologyLink")}
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
