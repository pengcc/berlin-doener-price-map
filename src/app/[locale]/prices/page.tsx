import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { ConfidenceBadge } from "@/components/data/confidence-badge";
import { EmptyState } from "@/components/data/empty-state";
import type { Locale } from "@/i18n/routing";
import { getLatestPrices } from "@/lib/data/get-latest-prices";
import { loadDataSet } from "@/lib/data/load-data";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function PricesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "PricesPage" });
  const labels = await getTranslations({ locale, namespace: "Labels" });
  const prices = getLatestPrices(loadDataSet()).filter(
    (price) => !price.isOutdated,
  );

  return (
    <AppShell activeHref="/prices" locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      {prices.length === 0 ? (
        <EmptyState body={t("empty.body")} title={t("empty.title")} />
      ) : (
        <div className="overflow-x-auto border border-neutral-900/10 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-neutral-100 text-neutral-600 text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">{t("table.shop")}</th>
                <th className="px-4 py-3 font-medium">{t("table.district")}</th>
                <th className="px-4 py-3 font-medium">{t("table.product")}</th>
                <th className="px-4 py-3 font-medium">{t("table.price")}</th>
                <th className="px-4 py-3 font-medium">{t("table.observed")}</th>
                <th className="px-4 py-3 font-medium">
                  {t("table.confidence")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/10">
              {prices.map((price) => (
                <tr key={price.id}>
                  <td className="px-4 py-4">
                    <p className="font-medium">
                      {price.shop.name ?? price.shop.address}
                    </p>
                    <p className="mt-1 text-neutral-500 text-sm">
                      {price.shop.address}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <p>{price.shop.district}</p>
                    <p className="text-neutral-500">{price.shop.borough}</p>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {labels(`productTypes.${price.productType}`)}
                  </td>
                  <td className="px-4 py-4 font-semibold">
                    {formatCurrency(price.priceCents, locale)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {formatDate(price.observedAt, locale)}
                  </td>
                  <td className="px-4 py-4">
                    <ConfidenceBadge
                      label={labels(`confidence.${price.confidenceLabel}`)}
                      value={price.confidenceLabel}
                    />
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
