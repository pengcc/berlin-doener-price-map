type Props = {
  eyebrow: string;
  intro: string;
  title: string;
};

export function PageHeader({ eyebrow, intro, title }: Props) {
  return (
    <header className="grid gap-4 border-neutral-900/10 border-b pb-7 lg:grid-cols-[1fr_0.8fr] lg:items-end">
      <div className="flex flex-col gap-3">
        <p className="font-medium text-emerald-700 text-sm uppercase tracking-[0.08em]">
          {eyebrow}
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-neutral-950 sm:text-5xl">
          {title}
        </h1>
      </div>
      <p className="max-w-2xl text-base text-neutral-700 leading-7 lg:justify-self-end">
        {intro}
      </p>
    </header>
  );
}
