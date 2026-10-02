// Row of headline numbers at the top of a country/genre hub page.
export default function HubStats({
  items,
  locale,
}: {
  items: { label: string; value: number | string | null }[];
  locale: string;
}) {
  const fmt = new Intl.NumberFormat(locale);
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
      {items
        .filter((i) => i.value !== null)
        .map((i) => (
          <div key={i.label} className="bg-c-surface border border-c-border rounded-xl px-4 py-3">
            <dt className="text-xs font-medium text-c-faint uppercase tracking-wide">{i.label}</dt>
            <dd className="text-2xl font-bold text-c-text mt-1">
              {typeof i.value === "number" ? fmt.format(i.value) : i.value}
            </dd>
          </div>
        ))}
    </dl>
  );
}
