export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-8 flex gap-6 overflow-x-auto border-b border-white/10 sm:gap-8" role="tablist">
      {tabs.map(([v, label, count]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`-mb-px shrink-0 border-b pb-3 text-sm transition-colors duration-200 active:opacity-70 ${
            value === v ? "border-azure text-ink" : "border-transparent text-ink-3 hover:text-azure"
          }`}
        >
          {label}
          {count > 0 && <span className="ml-2 text-xs tabular-nums text-azure">{count}</span>}
        </button>
      ))}
    </div>
  );
}