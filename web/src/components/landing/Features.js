import Link from "next/link";

const FEATURES = [
  ["Private by default", "Files are encrypted in your browser before upload. Only the people you choose can unlock them."],
  ["Permissions that hold", "Who may view, download or edit a file is recorded on the blockchain, with an optional end date."],
  ["Tamper detection", "Every version has a fingerprint on the blockchain. Open or verify a file and Convey checks that it still matches."],
  ["Requests and control", "Recipients can ask for more access. Owners can remove access, or delete a file only for themselves or for everyone."],
  ["A permanent audit trail", "Managers and administrators can review who sent, opened or removed what, and export the history."],
  ["No passwords", "Sign in with your MetaMask wallet. There is nothing to remember and no password database to steal."],
];

export default function Features() {
  return (
    <section className="bg-panel px-6 py-24 text-white md:px-12 md:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-3xl leading-tight md:text-5xl">Built for confidential work</h2>
        <div className="mt-14 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, text]) => (
            <div key={title} className="bg-panel p-6 md:p-8">
              <h3 className="text-base font-medium">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm leading-relaxed text-white/70">Ready to try it? Connect your wallet to get started, or read more about the project.</p>
          <div className="flex gap-4">
            <Link href="/login" className="bg-white px-8 py-3.5 text-sm font-medium text-black transition duration-200 ease-out hover:bg-white/90 active:scale-[0.97]">Create account</Link>
            <Link href="/about" className="border border-white/25 px-8 py-3.5 text-sm font-medium text-white">About Convey</Link>
          </div>
        </div>
      </div>
    </section>
  );
}