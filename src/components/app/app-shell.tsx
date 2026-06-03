import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { type DataMode, getPathForDataMode } from "@/lib/data/data-source";

type Props = {
  activeHref: string;
  children: ReactNode;
  dataMode: DataMode;
  locale: Locale;
};

const navItems = [
  { href: "/", key: "home" },
  { href: "/map", key: "map" },
  { href: "/prices", key: "prices" },
  { href: "/ranking", key: "ranking" },
  { href: "/districts", key: "districts" },
  { href: "/methodology", key: "methodology" },
  { href: "/submit", key: "submit" },
] as const;

export async function AppShell({
  activeHref,
  children,
  dataMode,
  locale,
}: Props) {
  const t = await getTranslations({ locale, namespace: "Navigation" });
  const dataModeText = await getTranslations({ locale, namespace: "DataMode" });
  const isDemoMode = dataMode === "demo";
  const currentModePath = getPathForDataMode(activeHref, dataMode);
  const canSwitchDataMode = navItems.some((item) => item.href === activeHref);

  return (
    <main
      className={`min-h-screen text-neutral-950 ${
        isDemoMode ? "bg-[#f0fdf4]" : "bg-[#fff7ed]"
      }`}
    >
      <header
        className={`border-b ${
          isDemoMode
            ? "border-emerald-800/20 bg-emerald-50/90"
            : "border-amber-800/20 bg-amber-50/90"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <Link
            className="flex flex-col gap-1"
            href={getPathForDataMode("/", dataMode)}
            locale={locale}
          >
            <span className="font-semibold text-2xl tracking-normal">
              {t("brand")}
            </span>
            <span className="text-neutral-600 text-sm">{t("tagline")}</span>
          </Link>

          <div className="flex flex-col gap-3 lg:items-end">
            <nav aria-label={t("navLabel")}>
              <ul className="flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const isActive = activeHref === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`inline-flex min-h-10 items-center border px-3 text-sm transition-colors ${
                          isActive
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-900/15 bg-white text-neutral-700 hover:border-neutral-950"
                        }`}
                        href={getPathForDataMode(item.href, dataMode)}
                        locale={locale}
                      >
                        {t(item.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {canSwitchDataMode ? (
                <nav aria-label={dataModeText("selector.label")}>
                  <ul className="inline-flex border border-neutral-900/15 bg-white p-1">
                    {(["production", "demo"] as const).map((mode) => {
                      const isActive = dataMode === mode;

                      return (
                        <li key={mode}>
                          <Link
                            aria-current={isActive ? "true" : undefined}
                            className={`inline-flex min-h-9 items-center px-3 font-medium text-sm transition-colors ${
                              isActive
                                ? mode === "demo"
                                  ? "bg-emerald-800 text-white"
                                  : "bg-amber-700 text-white"
                                : "text-neutral-700 hover:bg-neutral-100"
                            }`}
                            href={getPathForDataMode(activeHref, mode)}
                            locale={locale}
                          >
                            {dataModeText(
                              mode === "demo"
                                ? "selector.demo"
                                : "selector.real",
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              ) : null}

              <nav aria-label={t("languageLabel")}>
                <ul className="inline-flex border border-neutral-900/15 bg-white p-1">
                  {routing.locales.map((targetLocale) => {
                    const isActive = locale === targetLocale;

                    return (
                      <li key={targetLocale}>
                        <Link
                          aria-current={isActive ? "true" : undefined}
                          className={`inline-flex min-h-9 items-center px-3 font-medium text-sm transition-colors ${
                            isActive
                              ? "bg-neutral-950 text-white"
                              : "text-neutral-700 hover:bg-neutral-100"
                          }`}
                          href={currentModePath}
                          hrefLang={targetLocale}
                          locale={targetLocale}
                        >
                          {t(`locales.${targetLocale}`)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-10">
        {isDemoMode ? (
          <section className="border border-amber-700/25 bg-amber-50 p-4 text-amber-950">
            <p className="font-semibold text-sm">
              {dataModeText("demo.title")}
            </p>
            <p className="mt-1 text-sm leading-6">
              {dataModeText("demo.body")}
            </p>
          </section>
        ) : null}
        {children}
      </div>

      <footer className="border-neutral-900/10 border-t bg-white/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-5 text-neutral-600 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>{t("footerText")}</p>
          <nav aria-label={t("footerLabel")}>
            <ul className="flex flex-wrap gap-4">
              <li>
                <Link
                  className="text-neutral-700 hover:text-neutral-950"
                  href={getPathForDataMode("/methodology", dataMode)}
                  locale={locale}
                >
                  {t("methodology")}
                </Link>
              </li>
              <li>
                <Link
                  className="text-neutral-700 hover:text-neutral-950"
                  href="/imprint"
                  locale={locale}
                >
                  {t("imprint")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </main>
  );
}
