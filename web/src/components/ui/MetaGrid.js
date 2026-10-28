export default function MetaGrid({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className="bg-card px-4 py-3.5">
          <dt className="text-[11px] uppercase tracking-wider text-white/40">{it.label}</dt>
          <dd className="mt-1.5 text-sm text-white/90">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}