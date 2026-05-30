import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/data/empty-state";
import type { Locale } from "@/i18n/routing";
import type { LatestPrice } from "@/lib/data/get-latest-prices";
import { getPriceRankings } from "@/lib/data/get-rankings";
import { loadDataSet } from "@/lib/data/load-data";
import { formatCurrency, formatDate, formatInteger } from "@/lib/i18n/format";

type Props = {
  params: Promise<{ locale: Locale }>;
};

function RankingList({
  emptyBody,
  emptyTitle,
  locale,
  prices,
  title,
}: {
  emptyBody: string;
  emptyTitle: string;
  locale: Locale;
  prices: LatestPrice[];
  title: string;
}) {
  return (
    <section className="border border-neutral-900/10 bg-white p-5">
      <h2 className="font-semibold text-xl">{title}</h2>
      {prices.length === 0 ? (
        <div className="mt-4">
          <EmptyState body={emptyBody} title={emptyTitle} />
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-neutral-900/10">
          {prices.map((price, index) => (
            <li className="flex gap-4 py-4" key={price.id}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-neutral-950 font-semibold text-sm text-white">
                {formatInteger(index + 1, locale)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {price.shop.name ?? price.shop.address}
                    </p>
                    <p className="text-neutral-500 text-sm">
                      {price.shop.district}
                    </p>
                  </div>
                  <p className="font-semibold text-xl">
                    {formatCurrency(price.priceCents, locale)}
                  </p>
                </div>
                <p className="mt-2 text-neutral-500 text-sm">
                  {formatDate(price.observedAt, locale)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function RankingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "RankingPage" });
  const labels = await getTranslations({ locale, namespace: "Labels" });
  const rankings = getPriceRankings(loadDataSet(), { limit: 5 });

  return (
    <AppShell activeHref="/ranking" locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      <section className="border border-neutral-900/10 bg-white p-5">
        <p className="font-medium text-neutral-950">
          {t("summary", {
            count: formatInteger(rankings.sampleCount, locale),
            product: labels(`productTypes.${rankings.productType}`),
            updated: rankings.lastUpdatedAt
              ? formatDate(rankings.lastUpdatedAt, locale)
              : t("notUpdated"),
          })}
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <RankingList
          emptyBody={t("empty.body")}
          emptyTitle={t("empty.title")}
          locale={locale}
          prices={rankings.cheapest}
          title={t("sections.cheapest")}
        />
        <RankingList
          emptyBody={t("empty.body")}
          emptyTitle={t("empty.title")}
          locale={locale}
          prices={rankings.mostExpensive}
          title={t("sections.mostExpensive")}
        />
        <RankingList
          emptyBody={t("empty.body")}
          emptyTitle={t("empty.title")}
          locale={locale}
          prices={rankings.recentlyUpdated}
          title={t("sections.recentlyUpdated")}
        />
        <RankingList
          emptyBody={t("empty.body")}
          emptyTitle={t("empty.title")}
          locale={locale}
          prices={rankings.bestConfidence}
          title={t("sections.bestConfidence")}
        />
      </div>
    </AppShell>
  );
}
