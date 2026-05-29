import type { Locale } from "@/i18n/routing";
import { formatPriceCents } from "@/lib/price/format-price";

const localeTags: Record<Locale, string> = {
  de: "de-DE",
  en: "en-US",
  zh: "zh-CN",
};

export function getLocaleTag(locale: Locale) {
  return localeTags[locale];
}

export function formatCurrency(priceCents: number, locale: Locale) {
  return formatPriceCents(priceCents, getLocaleTag(locale));
}

export function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatInteger(value: number, locale: Locale) {
  return new Intl.NumberFormat(getLocaleTag(locale)).format(value);
}
