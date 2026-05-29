import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/data/empty-state";
import type { Locale } from "@/i18n/routing";
import { calculateDistrictStats } from "@/lib/data/calculate-district-stats";
import { loadDataSet } from "@/lib/data/load-data";
import { formatCurrency, formatDate, formatInteger } from "@/lib/i18n/format";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function DistrictsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "DistrictsPage" });
  const districts = calculateDistrictStats(loadDataSet());

  return (
    <AppShell activeHref="/districts" locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      <section className="border border-amber-700/20 bg-amber-50 p-5 text-amber-950 text-sm leading-6">
        {t("caveat")}
      </section>

      {districts.length === 0 ? (
        <EmptyState body={t("empty.body")} title={t("empty.title")} />
      ) : (
        <div className="overflow-x-auto border border-neutral-900/10 bg-white">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-neutral-100 text-neutral-600 text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">{t("table.district")}</th>
                <th className="px-4 py-3 font-medium">{t("table.average")}</th>
                <th className="px-4 py-3 font-medium">{t("table.median")}</th>
                <th className="px-4 py-3 font-medium">{t("table.min")}</th>
                <th className="px-4 py-3 font-medium">{t("table.max")}</th>
                <th className="px-4 py-3 font-medium">{t("table.samples")}</th>
                <th className="px-4 py-3 font-medium">{t("table.updated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/10">
              {districts.map((district) => (
                <tr key={district.district}>
                  <td className="px-4 py-4">
                    <p className="font-medium">{district.district}</p>
                    <p className="text-neutral-500 text-sm">
                      {district.borough}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {formatCurrency(district.averagePriceCents, locale)}
                  </td>
                  <td className="px-4 py-4">
                    {formatCurrency(district.medianPriceCents, locale)}
                  </td>
                  <td className="px-4 py-4">
                    {formatCurrency(district.minPriceCents, locale)}
                  </td>
                  <td className="px-4 py-4">
                    {formatCurrency(district.maxPriceCents, locale)}
                  </td>
                  <td className="px-4 py-4">
                    {formatInteger(district.sampleCount, locale)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {formatDate(district.lastUpdatedAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
