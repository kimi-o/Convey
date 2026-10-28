"use client";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { accessLabel } from "@/lib/contract";
import { notify } from "@/lib/notify";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { inputCls, labelCls } from "@/components/ui/styles";

const LEVEL_TEXT = { 1: "View only", 2: "Download", 3: "Edit" };

export default function RequestModal({ file, onClose }) {
  const { contract } = useWallet();
  const { refresh } = useVault();
  const options = [1, 2, 3].filter((l) => l > file.level);
  const [level, setLevel] = useState(options[0]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reason.trim()) return notify.error("Please add a short reason.");
    setBusy(true);
    try {
      await (await contract.requestAccess(file.id, level, reason.trim())).wait();
      await refresh();
      notify.success("Permission request sent.");
      onClose();
    } catch (e) {
      notify.error(e);
      setBusy(false);
    }
  }

  return (
    <Modal title="Request permission" locked={busy} onClose={onClose}>
      <p className="mb-4 text-sm text-white/60">{file.name}</p>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Current permission</span>
            <p className="flex h-10 items-center border border-white/10 bg-card-2 px-3 text-sm text-white/80">{accessLabel(file)}</p>
          </div>
          <label className="block">
            <span className={labelCls}>Permission needed</span>
            <select className={inputCls} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {options.map((l) => <option key={l} value={l}>{LEVEL_TEXT[l]}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Reason</span>
          <textarea rows={3} className={`${inputCls} !h-auto py-2.5`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button onClick={send} loading={busy} loadingText="Waiting for blockchain…">Send</Button>
      </div>
    </Modal>
  );
}