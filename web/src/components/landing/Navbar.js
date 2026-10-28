import Link from "next/link";
import ArrowLink from "@/components/ui/ArrowLink";

export default function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
      <Link href="/" className="font-display text-xl font-medium tracking-tight text-white">Convey</Link>
      <nav className="flex items-center gap-6 md:gap-8">
        <Link href="/#how-it-works" className="text-sm leading-none text-white/80 outline-none transition-transform duration-200 ease-out active:scale-95 focus-visible:text-white">
          How it works
        </Link>
        <ArrowLink href="/about">About us</ArrowLink>
      </nav>
    </header>
  );
}