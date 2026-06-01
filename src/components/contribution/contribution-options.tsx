export type ContributionCard = {
  actionLabel?: string;
  body: string;
  disabledLabel?: string;
  href?: string;
  status: string;
  title: string;
};

type Props = {
  cards: ContributionCard[];
  reviewNotice: string;
};

function isMailtoLink(href: string) {
  return href.startsWith("mailto:");
}

export function ContributionOptions({ cards, reviewNotice }: Props) {
  return (
    <>
      <section className="grid gap-5 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            className="flex min-h-64 flex-col justify-between border border-neutral-900/10 bg-white p-5"
            key={card.title}
          >
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col xl:flex-row">
                <h2 className="font-semibold text-xl">{card.title}</h2>
                <span className="w-fit border border-neutral-900/10 bg-neutral-100 px-2 py-1 text-neutral-600 text-xs">
                  {card.status}
                </span>
              </div>
              <p className="mt-4 text-neutral-700 text-sm leading-6">
                {card.body}
              </p>
            </div>

            {card.href ? (
              <a
                className="mt-5 inline-flex min-h-10 w-fit items-center bg-neutral-950 px-3 font-medium text-sm text-white"
                href={card.href}
                rel={isMailtoLink(card.href) ? undefined : "noreferrer"}
                target={isMailtoLink(card.href) ? undefined : "_blank"}
              >
                {card.actionLabel}
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="mt-5 inline-flex min-h-10 w-fit items-center border border-neutral-900/15 bg-neutral-100 px-3 text-neutral-600 text-sm"
              >
                {card.disabledLabel}
              </span>
            )}
          </article>
        ))}
      </section>

      <section className="border border-amber-700/20 bg-amber-50 p-5 text-amber-950 text-sm leading-6">
        {reviewNotice}
      </section>
    </>
  );
}
