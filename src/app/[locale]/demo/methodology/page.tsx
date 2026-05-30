import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: Locale }>;
};

function MethodSection({ body, title }: { body: string; title: string }) {
  return (
    <section className="border border-neutral-900/10 bg-white p-5">
      <h2 className="font-semibold text-xl">{title}</h2>
      <p className="mt-3 text-neutral-700 text-sm leading-6">{body}</p>
    </section>
  );
}

export default async function DemoMethodologyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dataMode = "demo";
  const t = await getTranslations({ locale, namespace: "MethodologyPage" });

  return (
    <AppShell activeHref="/methodology" dataMode={dataMode} locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <MethodSection
          body={t("sections.sources.body")}
          title={t("sections.sources.title")}
        />
        <MethodSection
          body={t("sections.review.body")}
          title={t("sections.review.title")}
        />
        <MethodSection
          body={t("sections.freshness.body")}
          title={t("sections.freshness.title")}
        />
        <MethodSection
          body={t("sections.rankings.body")}
          title={t("sections.rankings.title")}
        />
        <MethodSection
          body={t("sections.districts.body")}
          title={t("sections.districts.title")}
        />
        <MethodSection
          body={t("sections.limitations.body")}
          title={t("sections.limitations.title")}
        />
      </div>
    </AppShell>
  );
}
