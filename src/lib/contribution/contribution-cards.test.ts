import { describe, expect, it } from "vitest";
import { getContributionCards } from "./contribution-cards";
import { getContributionConfig } from "./contribution-config";

const text = {
  corrections: {
    bodyContact: "Contact correction body",
    bodyGithub: "GitHub correction body",
    linkContact: "Send correction",
    linkGithub: "Open correction issue",
    statusContact: "Contact configured",
    statusGithub: "GitHub fallback",
    title: "Corrections",
  },
  form: {
    bodyAvailable: "External form body",
    link: "Open public form",
    statusAvailable: "Public form configured",
    title: "Public form",
  },
  github: {
    body: "GitHub price body",
    link: "Open price issue",
    status: "Always available",
    title: "GitHub price issue",
  },
};

describe("contribution cards", () => {
  it("omits the public form card when no external form is configured", () => {
    const cards = getContributionCards(getContributionConfig({}), text);

    expect(cards.map((card) => card.title)).toEqual([
      "GitHub price issue",
      "Corrections",
    ]);
    expect(cards.some((card) => card.title === "Public form")).toBe(false);
  });

  it("shows the public form card when an external form URL is configured", () => {
    const cards = getContributionCards(
      getContributionConfig({
        DOENER_PRICE_FORM_URL: "https://example.com/form",
      }),
      text,
    );

    expect(cards[0]).toMatchObject({
      href: "https://example.com/form",
      status: "Public form configured",
      title: "Public form",
    });
  });
});
