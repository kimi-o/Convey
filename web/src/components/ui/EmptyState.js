export default function EmptyState({ title, text, children }) {
  return (
    <div className="border border-white/10 bg-card px-6 py-16 text-center">
      <p className="text-sm text-ink">{title}</p>
      {text && <p className="mt-1.5 text-sm text-ink-3">{text}</p>}
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </div>
  );
}