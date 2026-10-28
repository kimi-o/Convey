export default function Notice({ title, children, tone = "info", action }) {
  const edge = tone === "alert" ? "border-l-danger" : tone === "warn" ? "border-l-warn" : "border-l-white/30";
  return (
    <div role={tone === "alert" ? "alert" : "status"} className={`border border-l-2 border-white/10 ${edge} bg-card px-4 py-3.5`}>
      {title && <p className="text-sm font-medium text-ink">{title}</p>}
      {children && <p className={`${title ? "mt-0.5" : ""} text-sm leading-relaxed text-ink-2`}>{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}