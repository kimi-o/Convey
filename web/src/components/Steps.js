import { Check } from "lucide-react";

export default function Steps({ labels, current }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
              done ? "border-white/40 text-ink" : active ? "border-azure text-azure" : "border-white/15 text-ink-3"
            }`}>
              {done ? <Check size={11} strokeWidth={3} /> : active ? <span className="size-1.5 animate-pulse rounded-full bg-azure" /> : n}
            </span>
            <span className={done || active ? "text-ink" : "text-ink-3"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}