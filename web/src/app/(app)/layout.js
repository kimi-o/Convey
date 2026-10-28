"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import RouteProgress from "@/components/RouteProgress";
import { useWallet } from "@/context/WalletContext";
import { VaultProvider } from "@/context/VaultContext";

const STAFF = ["/dashboard", "/inbox", "/files", "/shared", "/permissions", "/verification", "/upload"];
const ROUTES = {
  1: STAFF,                  // Employee
  2: [...STAFF, "/audit"],   // Manager
  3: ["/dashboard", "/inbox", "/audit", "/users"], // Admin
};

export default function AppLayout({ children }) {
  const { ready, status, profile, account } = useWallet();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const lastAccount = useRef(null);

  useEffect(() => {
    if (ready && status !== "ready") router.replace("/login");
  }, [ready, status, router]);

  // Switching wallet accounts always starts on the dashboard
  useEffect(() => {
    if (status !== "ready") return;
    if (lastAccount.current && lastAccount.current !== account) router.replace("/dashboard");
    lastAccount.current = account;
  }, [status, account, router]);

  const allowed = !!profile && (ROUTES[profile.role] || []).some((p) => path === p || path.startsWith(p + "/"));
  useEffect(() => {
    if (status === "ready" && profile && !allowed) router.replace("/dashboard");
  }, [status, profile, allowed, router]);

  if (!ready || status !== "ready" || !profile || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="font-display text-2xl font-medium text-shimmer">Convey</span>
      </div>
    );
  }

  return (
    <VaultProvider key={account}>
      <RouteProgress />
      <div className="flex min-h-screen bg-canvas text-ink">
        <Sidebar open={menu} onClose={() => setMenu(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMenu(true)} />
          <main className="flex-1 px-4 pb-16 pt-4 sm:px-6 md:px-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </VaultProvider>
  );
}