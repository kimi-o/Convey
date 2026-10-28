const VARIANTS = {
  primary: "bg-white text-black hover:bg-white/90",
  secondary: "border border-white/15 text-ink hover:border-white/40",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
  dangerGhost: "text-danger hover:bg-danger/10",
  ghost: "text-ink-2 hover:text-azure",
};
const SIZES = { md: "h-10 px-4 text-sm", sm: "h-8 px-3 text-xs" };

/** Class string, so links can look like buttons too */
export const buttonClass = (variant = "primary", extra = "", size = "md") =>
  `inline-flex items-center justify-center gap-2 font-medium transition duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${extra}`;

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Button({ variant = "primary", size = "md", loading = false, loadingText = "", className = "", children, ...props }) {
  return (
    <button {...props} disabled={props.disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, className, size)}>
      {/* both layers share one grid cell, so the button never shrinks while loading */}
      <span className="inline-grid items-center justify-items-center">
        <span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${loading ? "invisible" : ""}`}>{children}</span>
        {loading && (
          <span className="col-start-1 row-start-1 inline-flex items-center gap-2">
            <Spinner />
            {loadingText}
          </span>
        )}
      </span>
    </button>
  );
}