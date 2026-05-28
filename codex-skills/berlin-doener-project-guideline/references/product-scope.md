# Product Scope

## Positioning

Berlin Döner Price Map is a community-curated, manually reviewed Berlin local data product. It helps users compare Döner prices by shop, location, and district while being transparent about freshness and confidence.

Primary product promise:

- DE: Dönerpreise in Berlin finden und vergleichen.
- EN: Find and compare Döner prices in Berlin.
- ZH: 在柏林地图上查看并比较 Döner 价格。

## Core User Jobs

1. See nearby Döner prices on a Berlin map.
2. Find cheap and expensive standard Döner prices.
3. Compare prices by district or Ortsteil.
4. Submit a new observed price through a low-friction path.
5. Understand how data is collected, reviewed, ranked, and marked as stale.

## MVP Pages

- `/`: overview, Berlin average, sample count, cheapest/most expensive preview, map preview, district preview, submit CTA, methodology link.
- `/map`: Berlin map with shop markers, price labels, popups, and filters for district, price range, confidence, and product type.
- `/prices`: sortable/filterable table of all current shop prices with search by shop name/address.
- `/ranking`: cheapest, most expensive, recently updated, and best-confidence views.
- `/districts`: average, median, min, max, sample count, and last update per district/Ortsteil.
- `/submit`: Tally or Google Form, GitHub Issue, and email correction entry points.
- `/methodology`: sources, review process, freshness, confidence, ranking rules, statistics, limitations, and disclaimer.
- `/about`: short project explanation if separate from methodology.

Use localized routes when i18n routing is implemented, for example `/de/karte`, `/en/map`, and `/zh/map` or a consistent locale segment strategy. Keep route naming consistent and documented.

## Submission Policy

MVP submissions must be manually reviewed before publication. The website should link out to:

- Tally or Google Form for normal users.
- GitHub Issue for technical/open-data contributors.
- Email for corrections.

Do not build a database-backed submission workflow in the MVP.

## Explicitly Out of Scope for MVP

- Database, Prisma, Supabase/PostgreSQL, or custom admin dashboard.
- User accounts, auth, roles, moderation UI, or payments.
- Crawlers, OCR, automated price scraping, or automated menu-photo extraction.
- Google Maps API as the default map stack.
- Automatic geocoding pipelines unless the user explicitly requests a small helper script and accepts API/provider constraints.
- Real-time user submissions appearing publicly without review.

## Product Tone

The app should feel like a practical Berlin local tool, not a marketing landing page. Prioritize dense, scannable information, clear filters, fast comparison, mobile usability, and transparent data caveats.
