import Link from "next/link";
import Navbar from "./Navbar";

export default function Hero() {
  return (
    <section className="flex min-h-screen flex-col bg-canvas text-white">
      <Navbar />

      {/* Headline area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <h1 className="font-display text-[clamp(2.75rem,12vw,10.5rem)] font-normal uppercase leading-none tracking-tight">
          Be Secured
        </h1>
        <p className="mt-8 text-sm text-white md:mt-10 md:text-base">
          File storage and transfer service.
        </p>
      </div>

      {/* Bottom band: text + buttons as one centered group */}
      <div className="bg-panel px-6 py-10 md:px-12 md:py-14">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 md:flex-row md:items-center md:justify-center md:gap-16">
          <p className="max-w-sm text-sm leading-relaxed text-white/90">
            Own and share any confidential files or documents with colleagues via
            Desktop across immutable system. Here files stay true to themself.
          </p>

          <div className="flex shrink-0 gap-4">
            <Link
              href="/login"
              className="bg-white px-8 py-3.5 text-sm font-medium text-black transition duration-200 ease-out hover:bg-white/90 active:scale-[0.97]"
            >
              Create account
            </Link>
            {/* Static on purpose: no hover or press effects */}
            <Link
              href="#how-it-works"
              className="border border-white/25 px-8 py-3.5 text-sm font-medium text-white"
            >
              Know more
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}