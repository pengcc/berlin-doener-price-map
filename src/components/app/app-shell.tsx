import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = {
  activeHref: string;
  children: ReactNode;
  locale: Locale;
};

const navItems = [
  { href: "/", key: "home" },
  { href: "/prices", key: "prices" },
  { href: "/ranking", key: "ranking" },
  { href: "/districts", key: "districts" },
  { href: "/methodology", key: "methodology" },
  { href: "/submit", key: "submit" },
] as const;

export async function AppShell({ activeHref, children, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Navigation" });

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-neutral-950">
      <header className="border-neutral-900/10 border-b bg-white/85">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <Link className="flex flex-col gap-1" href="/" locale={locale}>
            <span className="font-semibold text-2xl tracking-normal">
              {t("brand")}
            </span>
            <span className="text-neutral-600 text-sm">{t("tagline")}</span>
          </Link>

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
                      href={item.href}
                      locale={locale}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-10">
        {children}
      </div>
    </main>
  );
}
