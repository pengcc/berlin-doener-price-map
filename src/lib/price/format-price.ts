export function formatPriceCents(priceCents: number, locale = "de-DE") {
  return new Intl.NumberFormat(locale, {
    currency: "EUR",
    style: "currency",
  }).format(priceCents / 100);
}
