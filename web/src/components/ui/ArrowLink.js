import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";

export default function ArrowLink({ href, children, direction = "up-right", className = "" }) {
  const Icon = direction === "up-left" ? ArrowUpLeft : ArrowUpRight;
  const nudge =
    direction === "up-left"
      ? "group-active:-translate-x-0.5 group-active:-translate-y-0.5"
      : "group-active:translate-x-0.5 group-active:-translate-y-0.5";

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 text-sm leading-none text-white/80 outline-none transition-transform duration-200 ease-out active:scale-95 focus-visible:text-white ${className}`}
    >
      <span>{children}</span>
      <span className="flex size-5 shrink-0 items-center justify-center bg-white text-black">
        <Icon size={14} strokeWidth={2.5} className={`transition-transform duration-200 ease-out ${nudge}`} />
      </span>
    </Link>
  );
}