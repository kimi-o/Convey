"use client";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { ADMIN } from "@/lib/contract";
import { unwrapKey, wrapKey } from "@/lib/crypto";
import { expiryFromDays, sameAddr } from "@/lib/utils";
import { notify } from "@/lib/notify";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { inputCls, labelCls } from "@/components/ui/styles";

export default function ShareModal({ file, onClose, onDone }) {
  const { contract, account, unlockKeys } = useWallet();
  const { users, refresh } = useVault();
  const [picked, setPicked] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [level, setLevel] = useState(1);
  const [days, setDays] = useState(0);
  const [busy, setBusy] = useState(false);

  const term = q.trim().toLowerCase();
  const people = users
    .filter((u) => u.active && Number(u.role) !== ADMIN && !sameAddr(u.wallet, account))
    .filter((u) => !term || u.name.toLowerCase().includes(term) || u.department.toLowerCase().includes(term));

  const toggle = (w) => setPicked((s) => { const n = new Set(s); n.has(w) ? n.delete(w) : n.add(w); return n; });

  async function share() {
    const chosen = users.filter((u) => picked.has(u.wallet));
    if (!chosen.length) return notify.error("Choose at least one person.");
    setBusy(true);
    try {
      const kp = await unlockKeys();
      const mine = await contract.getMyGrant(file.id);
      const fileKey = unwrapKey(mine.wrappedKey, kp.secretKey);
      const keys = chosen.map((u) => wrapKey(fileKey, u.encKey));
      await (await contract.shareWithMany(file.id, chosen.map((u) => u.wallet), level, expiryFromDays(days), keys)).wait();
      await refresh();
      notify.success(`Shared with ${chosen.length} ${chosen.length === 1 ? "person" : "people"}.`);
      onDone?.();
      onClose();
    } catch (e) {
      notify.error(e);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Share “${file.name}”`} locked={busy} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <span className={labelCls}>People ({picked.size} selected)</span>
          <input className={`${inputCls} mb-2`} placeholder="Search people" aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-52 overflow-y-auto border border-white/10 bg-card-2">
            {people.length === 0 && <p className="px-3 py-4 text-sm text-white/55">No one to share with.</p>}
            {people.map((u) => {
              const noKeys = u.encKey.length !== 66;
              return (
                <label key={u.wallet} className={`flex items-center gap-3 border-t border-white/5 px-3 py-2.5 text-sm first:border-0 ${noKeys ? "opacity-50" : "cursor-pointer hover:bg-white/[0.03]"}`}>
                  <input type="checkbox" className="size-4 accent-[#4C8DF6]" disabled={noKeys} checked={picked.has(u.wallet)} onChange={() => toggle(u.wallet)} />
                  <span className="flex-1">{u.name}<span className="ml-2 text-xs text-white/55">{u.department}</span></span>
                  {noKeys && <span className="text-[11px] text-white/55">No keys yet</span>}
                </label>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Permission</span>
            <select className={inputCls} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              <option value={1}>View only</option>
              <option value={2}>Download</option>
              <option value={3}>Edit</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Expires</span>
            <select className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={0}>Never</option>
              <option value={1}>In 1 day</option>
              <option value={7}>In 7 days</option>
              <option value={30}>In 30 days</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button onClick={share} loading={busy} loadingText="Waiting for blockchain…">Share</Button>
      </div>
    </Modal>
  );
}