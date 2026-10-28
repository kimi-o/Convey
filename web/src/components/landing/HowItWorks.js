import Link from "next/link";

const STEPS = [
  ["Upload and lock", "Choose a file and upload it. Before anything leaves your browser, Convey takes a fingerprint of the file and encrypts it with a fresh key. Only the encrypted copy is ever stored, so the storage service never holds anything readable."],
  ["Record it on the blockchain", "The fingerprint, the storage reference and the permissions are written to a smart contract through your wallet. That record cannot be quietly edited or deleted, which is what makes tampering detectable."],
  ["Send it to the right people", "Pick who receives the file, what they may do with it (view, download or edit) and when their access ends. The file key is locked separately for each recipient, so only the people you choose can open it."],
  ["Open and verify", "When a recipient opens a file, Convey decrypts it in their browser and compares it with the blockchain record. If even one byte has changed, they are warned and the file is not opened."],
  ["Stay in control and accountable", "Owners can remove access at any time, and recipients can ask for more. Every important action is recorded, so managers and administrators can review exactly what happened and when."],
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-8 bg-panel px-6 py-24 text-white md:px-12 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.6fr] md:gap-20">
        <div className="md:sticky md:top-24 md:self-start">
          <p className="text-sm text-white/55">How it works</p>
          <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">Share files without trusting a middleman</h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">
            Convey lets people in an organization share confidential files without depending on one server or one
            administrator. Each file is locked before it leaves your computer, and every permission is written to a
            blockchain that nobody can quietly rewrite.
          </p>
        </div>
        <ol className="divide-y divide-white/10 border-y border-white/10">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-6 py-8 md:gap-10 md:py-10">
              <span className="w-8 shrink-0 pt-1 font-display text-sm text-white/55">0{i + 1}</span>
              <div>
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}