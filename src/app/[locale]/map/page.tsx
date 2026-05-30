import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { MapExperience } from "@/components/map/map-experience";
import type { Locale } from "@/i18n/routing";
import { loadAppDataSet } from "@/lib/data/data-source";
import { getMapPricePoints } from "@/lib/map/map-data";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function MapPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dataMode = "production";
  const t = await getTranslations({ locale, namespace: "MapPage" });
  const { dataSet } = loadAppDataSet(dataMode);
  const points = getMapPricePoints(dataSet);

  return (
    <AppShell activeHref="/map" dataMode={dataMode} locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />
      <MapExperience locale={locale} points={points} />
    </AppShell>
  );
}
