import { expect, type Page, test } from "@playwright/test";

const PRICE_OBSERVATION_ISSUE_URL =
  "https://github.com/pengcc/berlin-doener-price-map/issues/new?template=01-price-observation.yml";
const DATA_CORRECTION_ISSUE_URL =
  "https://github.com/pengcc/berlin-doener-price-map/issues/new?template=02-data-correction.yml";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(overflow).toBe(false);
}

test("localized home routes load", async ({ page }) => {
  const routes = [
    {
      heading: "Dönerpreise in Berlin finden und vergleichen",
      url: "/de",
    },
    {
      heading: "Find and compare Döner prices in Berlin",
      url: "/en",
    },
    {
      heading: "在柏林查找并比较 Döner 价格",
      url: "/zh",
    },
  ];

  for (const route of routes) {
    await page.goto(route.url);
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("real and demo data modes stay aligned on the same route", async ({
  page,
}) => {
  await page.goto("/de/prices");

  await page.getByRole("link", { name: "Demo-Daten" }).click();
  await expect(page).toHaveURL(/\/de\/demo\/prices$/);
  await expect(page.getByText("Nicht verifizierte Demo-Daten")).toBeVisible();

  await page.getByRole("link", { name: "Echte Daten" }).click();
  await expect(page).toHaveURL(/\/de\/prices$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Aktuelle Dönerpreise" }),
  ).toBeVisible();
});

test("demo prices render reviewed UI with generated demo rows", async ({
  page,
}) => {
  await page.goto("/de/demo/prices");

  await expect(page.getByText("Nicht verifizierte Demo-Daten")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  expect(await page.locator("tbody tr").count()).toBeGreaterThan(0);
  await expect(page.getByText("Demo Doener Mitte")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("submit page exposes structured issue form fallbacks", async ({
  page,
}) => {
  await page.goto("/de/submit");

  await expect(page.getByText("Formular nicht eingerichtet")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Preis-Issue öffnen" }),
  ).toHaveAttribute("href", PRICE_OBSERVATION_ISSUE_URL);
  await expect(
    page.getByRole("link", { name: "Korrektur-Issue öffnen" }),
  ).toHaveAttribute("href", DATA_CORRECTION_ISSUE_URL);
  await expectNoHorizontalOverflow(page);
});

test("production map without MapTiler key does not load fallback tiles", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.NEXT_PUBLIC_MAPTILER_API_KEY),
    "MapTiler key configured; no-key production notice is not expected.",
  );

  await page.goto("/de/map");

  await expect(
    page.getByText("Kartentiles sind nicht konfiguriert"),
  ).toBeVisible();
  await expect(page.getByText("NEXT_PUBLIC_MAPTILER_API_KEY")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("critical mobile routes do not overflow horizontally", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });

  for (const url of ["/de", "/de/demo/prices", "/de/demo/submit", "/de/map"]) {
    await page.goto(url);
    await expectNoHorizontalOverflow(page);
  }
});
