"use client";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { notify } from "@/lib/notify";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { inputCls, labelCls } from "@/components/ui/styles";

const NOTES = {
  me: "The file leaves your list. People you sent it to keep their access.",
  everyone: "The file is removed for you and everyone you sent it to. They are told that you deleted it.",
};

export default function DeleteModal({ file, onClose, onDone }) {
  const { contract } = useWallet();
  const { refresh, shares } = useVault();
  const [scope, setScope] = useState("me");
  const [busy, setBusy] = useState(false);
  const people = shares.filter((s) => s.file.id === file.id).length;

  async function go() {
    const everyone = file.mine && scope === "everyone";
    setBusy(true);
    try {
      await (await (everyone ? contract.deleteForEveryone(file.id) : contract.hideFile(file.id))).wait();
      await refresh();
      notify.success(everyone ? "File deleted for everyone." : "File removed from your list.");
      onDone?.();
      onClose();
    } catch (e) {
      notify.error(e);
      setBusy(false);
    }
  }

  return (
    <Modal title={file.mine ? "Delete file" : "Remove file"} locked={busy} onClose={onClose}>
      <p className="mb-4 truncate text-sm text-ink-2">{file.name}</p>
      {file.mine ? (
        <div className="space-y-3">
          <label className="block">
            <span className={labelCls}>Delete option</span>
            <select className={inputCls} value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="me">Delete from me</option>
              <option value="everyone">Delete from receivers too</option>
            </select>
          </label>
          <p className="text-sm leading-relaxed text-ink-3">
            {NOTES[scope]}
            {people > 0 && ` Currently shared with ${people} ${people === 1 ? "person" : "people"}.`}
          </p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-ink-3">
          The file leaves your list. You won't see it again unless the owner sends it to you again.
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button onClick={go} loading={busy} loadingText="Waiting for confirmation">
          {file.mine && scope === "everyone" ? "Delete for everyone" : file.mine ? "Delete" : "Remove"}
        </Button>
      </div>
    </Modal>
  );
}