"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mail, Menu } from "lucide-react";
import { InboxIcon } from "@/components/ui/icons";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { ROLES } from "@/lib/contract";

export default function Topbar({ onMenu }) {
  const { account, profile, switchAccount, signOut } = useWallet();
  const { unread } = useVault();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.replace("/login");
  }

  const item = "block w-full py-2 text-left text-sm text-ink-2 transition-colors duration-150 hover:text-azure";

  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 px-4 sm:px-6 md:justify-end md:px-10">
      <div className="flex items-center gap-4 md:hidden">
        <button onClick={onMenu} aria-label="Open menu" className="-ml-1 p-1 text-ink-2 transition-colors duration-150 hover:text-azure">
          <Menu size={20} />
        </button>
        <Link href="/dashboard" className="font-display text-lg font-medium text-shimmer">Convey</Link>
      </div>

      <div className="flex items-center gap-5 sm:gap-6">
        <Link
          href="/inbox"
          className={`flex items-center gap-2 text-sm transition duration-150 active:scale-95 hover:text-azure ${path.startsWith("/inbox") ? "text-azure" : "text-ink-2"}`}
        >
          <InboxIcon size={18} className="text-ink-3" />
          Inbox
          {unread > 0 && <span className="text-xs tabular-nums text-azure">{unread}</span>}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Account menu"
            aria-expanded={open}
            className="flex size-10 items-center justify-center rounded-full border border-white/20 text-sm font-medium text-ink transition duration-150 hover:border-white/50 active:scale-95"
          >
            {profile.name.charAt(0).toUpperCase()}
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-64 animate-fade-up border border-white/10 bg-panel p-4 shadow-xl motion-reduce:animate-none">
              <p className="text-sm font-medium text-ink">{profile.name}</p>
              <p className="mt-0.5 text-xs text-ink-3">{ROLES[profile.role]}, {profile.department}</p>
             
              <div className="mt-3 border-t border-white/10 pt-2">
                <button className={item} onClick={() => { setOpen(false); switchAccount(); }}>Switch account</button>
                <button className={item} onClick={handleSignOut}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}