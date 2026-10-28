import Link from "next/link";

const YEAR = 2026;

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-canvas px-6 py-8 text-white md:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-base text-white">Convey</span>
        <nav className="flex gap-6">
          <Link href="/#how-it-works" className="transition-colors duration-200 hover:text-white">How it works</Link>
          <Link href="/about" className="transition-colors duration-200 hover:text-white">About</Link>
          <Link href="/login" className="transition-colors duration-200 hover:text-white">Launch app</Link>
        </nav>
        <span>© {YEAR} Convey</span>
      </div>
    </footer>
  );
}