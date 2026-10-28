const TONE = { strong: "text-ink", default: "text-ink-2", muted: "text-ink-3" };

export default function Badge({ children, color, tone }) {
  const t = tone || (color === "slate" ? "muted" : "default");
  return <span className={`inline-flex items-center text-xs ${TONE[t]}`}>{children}</span>;
}