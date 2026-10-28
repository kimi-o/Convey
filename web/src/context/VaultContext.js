"use client";
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useWallet } from "@/context/WalletContext";
import { toMyFile } from "@/lib/contract";
import { loadEvents } from "@/lib/events";
import { buildMessages } from "@/lib/inbox";
import { sameAddr, short } from "@/lib/utils";

const VaultCtx = createContext(null);

export const useVault = () => {
  const ctx = useContext(VaultCtx);
  if (!ctx) throw new Error("useVault must be used inside <VaultProvider> (check src/app/(app)/layout.js)");
  return ctx;
};

const EMPTY = { loaded: false, users: [], files: [], requests: [], shares: [], events: [] };
const POLL_MS = 20000;

// Which inbox messages were read is remembered per wallet in this browser
const readKey = (a) => `convey-read:${a.toLowerCase()}`;
const loadRead = (a) => { try { return new Set(JSON.parse(localStorage.getItem(readKey(a)) || "[]")); } catch { return new Set(); } };
const saveRead = (a, set) => { try { localStorage.setItem(readKey(a), JSON.stringify([...set].slice(-1000))); } catch {} };

export function VaultProvider({ children }) {
  const { contract, account } = useWallet();
  const [data, setData] = useState(EMPTY);
  const [read, setRead] = useState(() => new Set());
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++seq.current;
    try {
      const [raw, users, reqs, events] = await Promise.all([
        contract.getMyFiles(),
        contract.getAllUsers(),
        contract.getMyRequests(),
        loadEvents(contract).catch((e) => { console.error(e); return []; }),
      ]);
      const files = [...raw].map((f) => toMyFile(f, account));
      const byId = Object.fromEntries(files.map((f) => [f.id, f]));
      const owned = files.filter((f) => f.mine && f.isActive);
      const lists = await Promise.all(owned.map((f) => contract.getAccessList(f.id)));

      const userBy = Object.fromEntries([...users].map((u) => [u.wallet.toLowerCase(), u]));
      const shares = owned.flatMap((f, i) =>
        [...lists[i]].map((a) => {
          const u = userBy[a.user.toLowerCase()];
          return {
            key: `${f.id}-${a.user}`, file: f, user: a.user, name: u?.name || short(a.user),
            department: u?.department || "", level: Number(a.level), expiry: Number(a.expiry),
          };
        })
      );
      const requests = [...reqs]
        .map((r) => ({
          id: Number(r.id), fileId: Number(r.fileId), requester: r.requester, fromLevel: Number(r.fromLevel),
          level: Number(r.level), reason: r.reason, status: Number(r.status), ts: Number(r.timestamp),
          file: byId[Number(r.fileId)],
        }))
        .filter((r) => r.file);

      if (id !== seq.current) return;
      setData({ loaded: true, users: [...users], files, requests, shares, events });
    } catch (e) {
      console.error(e);
      if (id === seq.current) setData((d) => (d.loaded ? d : { ...d, loaded: true }));
    }
  }, [contract, account]);

  useEffect(() => {
    setData(EMPTY);
    setRead(loadRead(account));
    refresh();
    const tick = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = setInterval(tick, POLL_MS);
    window.addEventListener("focus", tick);
    return () => { clearInterval(timer); window.removeEventListener("focus", tick); };
  }, [refresh, account]);

  const markRead = useCallback((keys) => {
    setRead((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      saveRead(account, next);
      return next;
    });
  }, [account]);

  const value = useMemo(() => {
    const userBy = Object.fromEntries(data.users.map((u) => [u.wallet.toLowerCase(), u]));
    const nameOf = (a) => userBy[String(a).toLowerCase()]?.name || short(a);
    const youOf = (a) => (sameAddr(a, account) ? "You" : nameOf(a));
    const filesById = Object.fromEntries(data.files.map((f) => [f.id, f]));
    const uploadNames = {};
    data.events.forEach((e) => { if (e.name === "FileUploaded") uploadNames[e.fileId] = e.args.name; });
    const fileName = (id) => filesById[id]?.name || uploadNames[id] || `file #${id}`;

    const owned = data.files.filter((f) => f.mine && f.isActive);
    const received = data.files.filter((f) => !f.mine && f.isActive);
    const shared = data.files.filter((f) => !f.mine && (f.state === "active" || f.state === "deleted"));
    const incoming = data.requests.filter((r) => r.status === 0 && r.file.mine && r.file.isActive);
    const outgoing = data.requests.filter((r) => sameAddr(r.requester, account));

    const messages = buildMessages(data.events, { account, nameOf, fileName, filesById });
    const unread = messages.filter((m) => !read.has(m.key)).length;
    const myActivity = data.events.filter((e) => sameAddr(e.from, account)).reverse();
    const sentAt = {}; // when each file was sent to me
    data.events.forEach((e) => { if (e.name === "FileShared" && sameAddr(e.args.user, account)) sentAt[e.fileId] = e.time; });

    return {
      ...data, refresh, userBy, nameOf, youOf, fileName, filesById, sentAt,
      owned, received, shared, incoming, outgoing, messages, unread, read, markRead, myActivity,
    };
  }, [data, read, refresh, markRead, account]);

  return <VaultCtx.Provider value={value}>{children}</VaultCtx.Provider>;
}