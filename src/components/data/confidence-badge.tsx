import type { ConfidenceLabel } from "@/lib/price/confidence";

type Props = {
  label: string;
  value: ConfidenceLabel;
};

const classNames: Record<ConfidenceLabel, string> = {
  high: "border-emerald-700/25 bg-emerald-50 text-emerald-800",
  low: "border-red-700/25 bg-red-50 text-red-800",
  medium: "border-amber-700/25 bg-amber-50 text-amber-800",
  outdated: "border-neutral-700/25 bg-neutral-100 text-neutral-700",
};

export function ConfidenceBadge({ label, value }: Props) {
  return (
    <span
      className={`inline-flex min-h-7 items-center border px-2.5 font-medium text-xs ${classNames[value]}`}
    >
      {label}
    </span>
  );
}
