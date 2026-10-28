import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = { title: "About | Convey" };

// 👉 Fill in your own details
const PROJECT = { author: "Avijit and Gourav", institution: "Somaiya vidyavihar university", year: "2026" };

const FACTS = [
  ["Project type", "MSc project"],
  ["Subject", "Blockchain and information security"],
  ["Author", PROJECT.author],
  ["Institution", PROJECT.institution],
  ["Supervisor", PROJECT.supervisor],
  ["Year", PROJECT.year],
  ["Status", "Working prototype"],
  ["Network", "Ethereum (Sepolia test network)"],
];

const CONTENTS = [
  ["overview", "Overview"], ["background", "Background and motivation"], ["aims", "Aims and objectives"],
  ["approach", "Approach"], ["why", "Why a blockchain"], ["tech", "Technology"],
  ["shows", "What the prototype shows"], ["future", "Limitations and future work"],
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="border-b border-white/10 pb-2 font-display text-2xl">{title}</h2>
      <div className="mt-5 space-y-4 text-[15px] leading-7 text-white/80">{children}</div>
    </section>
  );
}
const List = ({ children }) => <ul className="list-disc space-y-2 pl-5 marker:text-white/55">{children}</ul>;

export default function About() {
  return (
    <main className="min-h-screen bg-canvas text-white">
      <Navbar />

      <figure className="mx-auto max-w-6xl px-6 md:px-12 md:pt-12">
        <div className="relative aspect-[16/10] w-full overflow-hidden border border-white/10 bg-panel md:aspect-[21/9]">
          <Image src="/about us img.svg" alt="" fill priority sizes="(min-width: 1280px) 1152px, 100vw" className="object-cover" />
        </div>
        {/* <figcaption className="mt-2 text-xs text-white/55">Convey keeps files private from the moment they leave your browser.</figcaption> */}
      </figure>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:px-12 md:pt-8">
        <h1 className="font-display text-4xl md:text-5xl">Convey</h1>
        <p className="mt-3 max-w-2xl text-white/70">A blockchain-based system for secure file sharing inside organizations.</p>
        <div className="mt-8 h-px bg-white/10" />

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem]">
          <aside className="space-y-6 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-8 lg:self-start">
            <div className="border border-white/10 bg-card">
              <p className="border-b border-white/10 bg-card-2 px-4 py-3 text-sm font-medium">Project details</p>
              <dl className="divide-y divide-white/5 text-sm">
                {FACTS.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3 px-4 py-2.5">
                    <dt className="text-white/55">{k}</dt>
                    <dd className="text-white/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <nav aria-label="Contents" className="border border-white/10 bg-card p-4">
              <p className="mb-3 text-sm font-medium">Contents</p>
              <ol className="space-y-1.5 text-sm">
                {CONTENTS.map(([id, label], i) => (
                  <li key={id}>
                    <a href={`#${id}`} className="text-white/70 transition-colors duration-200 hover:text-white">
                      <span className="mr-2 text-white/55">{i + 1}</span>{label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1">
            <Section id="overview" title="Overview">
              <p>Convey is a Master's (MSc) project that investigates how blockchain technology can make confidential file sharing inside an organization more private, more trustworthy and easier to audit. The result is a working prototype: a web application where people send documents, reports, spreadsheets and proposals to colleagues, while the rules about who may do what are held on a blockchain.</p>
            </Section>

            <Section id="background" title="Background and motivation">
              <p>Most organizations still move sensitive files by email, chat or shared drives. These tools depend on a central party that can read the files and can change permissions or history without anyone noticing. When something goes wrong, it is hard to prove who had access, which version is genuine, or whether a file was altered.</p>
              <p>Blockchains offer a shared record that no single person controls and that cannot be rewritten afterwards. The project explores whether that property can solve these everyday problems without making the system hard to use.</p>
            </Section>

            <Section id="aims" title="Aims and objectives">
              <List>
                <li>Study how organizations share confidential files and where current tools fall short.</li>
                <li>Design a system in which files stay encrypted and only authorised people can open them.</li>
                <li>Use a blockchain to hold permissions, file fingerprints and an audit trail.</li>
                <li>Build and evaluate a prototype with a clear, usable interface.</li>
                <li>Reflect on its strengths, limits and possible future work.</li>
              </List>
            </Section>

            <Section id="approach" title="Approach">
              <p>The design separates what must be secret from what must be trustworthy. File contents are encrypted in the browser and stored off the blockchain, because blockchains are costly and public. The blockchain keeps the small facts that matter: who owns a file, who may access it, a fingerprint of each version, and a log of actions.</p>
              <p>People sign in with a wallet, and every important action is confirmed by a blockchain transaction. This hybrid design gives privacy for the content and integrity for the record.</p>
            </Section>

            <Section id="why" title="Why a blockchain">
              <List>
                <li>Records cannot be quietly changed, so history can be trusted.</li>
                <li>The rules are enforced by a smart contract rather than by an administrator.</li>
                <li>An audit trail is created automatically as people use the system.</li>
              </List>
              <p>The trade-off is that actions take a few seconds to confirm and that some information, such as file names, is visible on a public network.</p>
            </Section>

            <Section id="tech" title="Technology">
              <p>The web application is built with Next.js and Tailwind CSS. The rules run in a Solidity smart contract developed with Hardhat and deployed on the Ethereum Sepolia test network. People connect with MetaMask, encrypted files are stored on IPFS through Pinata, and encryption uses the browser's Web Crypto features together with TweetNaCl.</p>
            </Section>

            <Section id="shows" title="What the prototype shows">
              <List>
                <li>Confidential files can be shared with exactly the intended people.</li>
                <li>Permissions can be limited, expire, be requested and be withdrawn.</li>
                <li>Altered files are detected by comparing them with the blockchain record.</li>
                <li>Managers and administrators can review a complete, tamper-resistant history.</li>
              </List>
            </Section>

            <Section id="future" title="Limitations and future work">
              <List>
                <li>File names and fingerprints are visible on a public blockchain; a private network or encrypted names would fix this.</li>
                <li>Removing access cannot take back a copy someone already downloaded.</li>
                <li>Each deployment serves one organization, and the online version accepts files up to 4 MB.</li>
                <li>Future work includes support for more wallets, larger files and several organizations in one system.</li>
              </List>
              <div className="pt-4">
                <Link href="/login" className="inline-block bg-white px-8 py-3.5 text-sm font-medium text-black transition duration-200 ease-out hover:bg-white/90 active:scale-[0.97]">Launch app</Link>
              </div>
            </Section>
          </article>
        </div>
      </div>
      <Footer />
    </main>
  );
}