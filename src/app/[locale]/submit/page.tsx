import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function SubmitPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "SubmitPage" });

  return (
    <AppShell activeHref="/submit" locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="border border-neutral-900/10 bg-white p-5">
          <h2 className="font-semibold text-xl">{t("form.title")}</h2>
          <p className="mt-3 text-neutral-700 text-sm leading-6">
            {t("form.body")}
          </p>
          <p className="mt-5 inline-flex min-h-10 items-center border border-neutral-900/15 bg-neutral-100 px-3 text-neutral-600 text-sm">
            {t("form.status")}
          </p>
        </div>

        <div className="border border-neutral-900/10 bg-white p-5">
          <h2 className="font-semibold text-xl">{t("github.title")}</h2>
          <p className="mt-3 text-neutral-700 text-sm leading-6">
            {t("github.body")}
          </p>
          <a
            className="mt-5 inline-flex min-h-10 items-center bg-neutral-950 px-3 font-medium text-sm text-white"
            href="https://github.com/pengcc/berlin-doener-price-map/issues/new"
            rel="noreferrer"
            target="_blank"
          >
            {t("github.link")}
          </a>
        </div>

        <div className="border border-neutral-900/10 bg-white p-5">
          <h2 className="font-semibold text-xl">{t("corrections.title")}</h2>
          <p className="mt-3 text-neutral-700 text-sm leading-6">
            {t("corrections.body")}
          </p>
          <p className="mt-5 inline-flex min-h-10 items-center border border-neutral-900/15 bg-neutral-100 px-3 text-neutral-600 text-sm">
            {t("corrections.status")}
          </p>
        </div>
      </section>

      <section className="border border-amber-700/20 bg-amber-50 p-5 text-amber-950 text-sm leading-6">
        {t("reviewNotice")}
      </section>
    </AppShell>
  );
}
