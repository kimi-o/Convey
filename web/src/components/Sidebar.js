"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { ADMIN, MANAGER } from "@/lib/contract";
import {
  DashboardIcon, FilesIcon, SharedIcon, PermissionIcon, VerificationIcon,
  UploadIcon, AuditIcon, AddUserIcon, ManageUserIcon,
} from "@/components/ui/icons";

const DASH = { href: "/dashboard", label: "Dashboard", icon: DashboardIcon };
const AUDIT = { href: "/audit", label: "Audit History", icon: AuditIcon };
const STAFF = [
  DASH,
  { href: "/files", label: "My Files", icon: FilesIcon },
  { href: "/shared", label: "Shared with me", icon: SharedIcon },
  { href: "/permissions", label: "Permissions", icon: PermissionIcon, badge: true },
  { href: "/verification", label: "Verification", icon: VerificationIcon },
  { href: "/upload", label: "Upload Files", icon: UploadIcon },
];
const ADMIN_NAV = [
  DASH,
  { href: "/users/add", label: "Add Users", icon: AddUserIcon },
  { href: "/users/manage", label: "Manage Users", icon: ManageUserIcon },
  AUDIT,
];

function Item({ href, label, icon: Icon, active, badge, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate(href)}
      className={`flex h-10 origin-left items-center gap-3 px-3 text-sm transition duration-150 active:scale-[0.97] ${
        active ? "text-azure" : "text-ink-2 hover:text-azure"
      }`}
    >
      {/* the icon keeps one color; only the text changes when a tab is active */}
      <span className="flex size-[18px] shrink-0 items-center justify-center text-ink-3">
        <Icon size={18} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && <span className="text-xs tabular-nums text-azure">{badge}</span>}
    </Link>
  );
}

export default function Sidebar({ open, onClose }) {
  const path = usePathname();
  const { profile } = useWallet();
  const { incoming } = useVault();
  const [pending, setPending] = useState(null);

  useEffect(() => { setPending(null); }, [path]);

  const current = pending || path;
  const isActive = (href) => current === href || current.startsWith(href + "/");
  const navigate = (href) => { setPending(href); onClose?.(); };
  const items = (profile.role === ADMIN ? ADMIN_NAV : STAFF).map((n) => (n.badge ? { ...n, badge: incoming.length } : n));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-panel transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:self-start ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative flex h-20 shrink-0 items-center px-8">
          <Link href="/dashboard" className="font-display text-xl font-medium tracking-tight text-shimmer">Convey</Link>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-white/5 via-white/25 to-white/5" />
        </div>
        <nav className="flex-1 overflow-y-auto px-5 py-8">
          <div className="space-y-1">
            {items.map((n) => <Item key={n.href} {...n} active={isActive(n.href)} onNavigate={navigate} />)}
          </div>
          {profile.role === MANAGER && (
            <>
              <p className="mb-2 mt-8 px-3 text-xs text-ink-3">Controls</p>
              <Item {...AUDIT} active={isActive(AUDIT.href)} onNavigate={navigate} />
            </>
          )}
        </nav>
      </aside>
    </>
  );
}