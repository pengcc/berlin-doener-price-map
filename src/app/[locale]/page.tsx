import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "HomePage" });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10">
      <header className="flex flex-col gap-4 border-b border-black/10 pb-8">
        <p className="text-sm font-medium uppercase text-neutral-500">
          {t("eyebrow")}
        </p>
        <h1 className="text-4xl font-semibold text-neutral-950 sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-neutral-700">
          {t("intro")}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="border border-black/10 p-4">
          <p className="text-sm text-neutral-500">{t("statusLabel")}</p>
          <p className="mt-2 text-xl font-medium text-neutral-950">
            {t("statusValue")}
          </p>
        </div>
        <div className="border border-black/10 p-4">
          <p className="text-sm text-neutral-500">{t("dataLabel")}</p>
          <p className="mt-2 text-xl font-medium text-neutral-950">
            {t("dataValue")}
          </p>
        </div>
        <div className="border border-black/10 p-4">
          <p className="text-sm text-neutral-500">{t("nextLabel")}</p>
          <p className="mt-2 text-xl font-medium text-neutral-950">
            {t("nextValue")}
          </p>
        </div>
      </section>
    </main>
  );
}
