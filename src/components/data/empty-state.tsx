type Props = {
  body: string;
  title: string;
};

export function EmptyState({ body, title }: Props) {
  return (
    <div className="border border-dashed border-neutral-900/25 bg-white/70 p-6">
      <p className="font-medium text-neutral-950">{title}</p>
      <p className="mt-2 max-w-2xl text-neutral-600 text-sm leading-6">
        {body}
      </p>
    </div>
  );
}
