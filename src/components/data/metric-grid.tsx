type Metric = {
  label: string;
  value: string;
};

type Props = {
  metrics: Metric[];
};

export function MetricGrid({ metrics }: Props) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          className="border border-neutral-900/10 bg-white p-5"
          key={metric.label}
        >
          <p className="text-neutral-500 text-sm">{metric.label}</p>
          <p className="mt-3 font-semibold text-2xl text-neutral-950">
            {metric.value}
          </p>
        </div>
      ))}
    </section>
  );
}
