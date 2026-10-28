"use client";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { deployed } from "@/lib/contract";
import ArrowLink from "@/components/ui/ArrowLink";

// 👉 If your MetaMask icon has a different name or extension, change this line only.
const METAMASK_ICON = "/metamask logo.png";

const STATUS_NOTICE = {
  "no-wallet": { text: "MetaMask was not detected in this browser. Install the extension and refresh the page.", mark: "not detected" },
  "no-contract": { text: "The vault contract was not found on this network. Make sure it is deployed.", mark: "not found" },
};

/** Simple message; only `mark` is shown in calm red */
function Notice({ text, mark }) {
  const i = mark ? text.indexOf(mark) : -1;
  return (
    <p role="alert" className="mt-6 max-w-md animate-fade-up text-sm leading-relaxed text-white/60 motion-reduce:animate-none">
      {i < 0 ? text : (
        <>
          {text.slice(0, i)}
          <span className="text-danger">{mark}</span>
          {text.slice(i + mark.length)}
        </>
      )}
    </p>
  );
}

function PrimaryButton({ busy, busyText, children, ...props }) {
  return (
    <button
      {...props}
      disabled={busy}
      className="flex w-full max-w-[16rem] items-center justify-center gap-2.5 bg-white px-8 py-3.5 text-sm font-medium text-black transition duration-200 ease-out hover:bg-white/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-70 sm:w-auto sm:min-w-[12rem]"
    >
      {busy ? <span className="animate-pulse">{busyText}</span> : children}
    </button>
  );
}

export default function Login() {
  const { account, status, error, busy, ready, connect, switchNetwork, switchAccount, setupKeys } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (ready && status === "ready") router.replace("/dashboard");
  }, [ready, status, router]);

  // Each screen: heading, optional line and address, button, message, optional helper line
  let view = null;
  if (ready && status !== "ready") {
    if (status === "wrong-network") {
      view = {
        key: "network",
        heading: "Switch to right network",
        body: `Your wallet is on a different network than this vault (chain ${deployed.chainId}).`,
        helper: "MetaMask will ask for your permission before it switches.",
        notice: error,
        action: <PrimaryButton onClick={switchNetwork} busy={busy} busyText="Switching…">Switch Network</PrimaryButton>,
      };
    } else if (status === "unregistered") {
      view = {
        key: "unregistered",
        heading: "Unregistered wallet address",
        address: account,
        helper: "Send this address to your administrator so they can add you, then sign in again. You can also switch to another account.",
        notice: error,
        action: <PrimaryButton onClick={switchAccount} busy={busy} busyText="Opening MetaMask…">Switch Account</PrimaryButton>,
      };
    } else if (status === "revoked") {
      view = {
        key: "revoked",
        heading: "Access revoked",
        body: "Your access to this vault was removed by an administrator.",
        address: account,
        helper: "Contact your administrator if you think this is a mistake, or sign in with a different account.",
        notice: error,
        action: <PrimaryButton onClick={switchAccount} busy={busy} busyText="Opening MetaMask…">Switch Account</PrimaryButton>,
      };
    } else if (status === "needs-keys") {
      view = {
        key: "keys",
        heading: "Create your encryption keys",
        body: "These keys let you send and receive files securely.",
        helper: "MetaMask will ask you to sign a message and confirm one transaction.",
        notice: error,
        action: <PrimaryButton onClick={setupKeys} busy={busy} busyText="Waiting for MetaMask…">Create Keys</PrimaryButton>,
      };
    } else {
      view = {
        key: "connect",
        heading: "Connect your wallet",
        body: "Sign in with your MetaMask wallet.",
        notice: error || STATUS_NOTICE[status] || null,
        action: (
          <PrimaryButton onClick={() => connect(false)} busy={busy} busyText="Connecting…">
            <Image src={METAMASK_ICON} alt="" width={18} height={18} unoptimized />
            MetaMask
          </PrimaryButton>
        ),
      };
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-white">
      <header className="flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <Link href="/" className="font-display text-xl font-medium tracking-tight text-white">Convey</Link>
        <ArrowLink href="/" direction="up-left">Back to home</ArrowLink>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        {view && (
          <div key={view.key} className="flex w-full max-w-4xl animate-fade-up flex-col items-center motion-reduce:animate-none">
            <h1 className="text-balance font-display text-[clamp(2rem,6.5vw,5rem)] font-normal uppercase leading-[1.05] tracking-tight">
              {view.heading}
            </h1>
            {view.body && <p className="mt-8 max-w-md text-sm leading-relaxed text-white/70 md:mt-10 md:text-base">{view.body}</p>}
            {view.address && <p className="mt-8 select-all break-all font-mono text-xs tracking-wide text-white/60 md:mt-10">{view.address}</p>}

            <div className="mt-10 flex w-full justify-center md:mt-12">{view.action}</div>

            {view.notice && <Notice {...view.notice} />}
            {view.helper && <p className="mt-8 max-w-sm text-sm leading-relaxed text-white/55">{view.helper}</p>}
          </div>
        )}
      </div>
    </main>
  );
}