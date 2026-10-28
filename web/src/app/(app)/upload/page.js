"use client";
import { useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { CATEGORIES } from "@/lib/contract";
import { sha256Hex, generateFileKey, encryptBuffer, wrapKey } from "@/lib/crypto";
import { uploadEncrypted } from "@/lib/ipfs";
import { fmtSize } from "@/lib/utils";
import { notify } from "@/lib/notify";
import Steps from "@/components/Steps";
import Button, { buttonClass } from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { inputCls, labelCls } from "@/components/ui/styles";
import Notice from "@/components/ui/Notice";

export default function UploadPage() {
  const { contract, unlockKeys } = useWallet();
  const { refresh } = useVault();
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Report");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return notify.error("Please choose a file first.");
    setBusy(true);
    try {
      const kp = await unlockKeys();
      setStep(1);
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      setStep(2);
      const fileKey = generateFileKey();
      const encrypted = await encryptBuffer(buf, fileKey);
      setStep(3);
      const cid = await uploadEncrypted(encrypted, file.name);
      setStep(4);
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      await (await contract.uploadFile({
        name: name.trim() ? name.trim() + ext : file.name,
        fileType: file.type || ext, category, cid, fileHash: hash, size: file.size,
        wrappedKey: wrapKey(fileKey, ethers.hexlify(kp.publicKey)),
      })).wait();
      await refresh();
      notify.success("File recorded on the blockchain.");
      setDone(true);
    } catch (err) {
      notify.error(err);
      setStep(0);
    } finally {
      setBusy(false);
    }
  }

  function again() { setFile(null); setName(""); setStep(0); setDone(false); }

  if (done) {
    return (
      <div className="max-w-xl">
        <PageTitle title="Upload Files" />
                <Notice title="Upload confirmed">Your file is encrypted, stored, and recorded on the blockchain.</Notice>
        <div className="mt-6 flex gap-3">
          <Link href="/files" className={buttonClass("primary")}>Go to My Files</Link>
          <Button variant="secondary" onClick={again}>Upload another</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <PageTitle title="Upload Files" />
      <div className="space-y-6">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && !busy) setFile(f); }}
          className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-white/15 bg-card px-6 py-14 text-center transition-colors duration-200 hover:border-azure"
        >
          <span className="max-w-full truncate text-sm text-white/80">{file ? file.name : "Click to choose a file, or drop it here"}</span>
          {file && <span className="mt-1 text-xs text-white/55">{fmtSize(file.size)}</span>}
          <input type="file" className="hidden" disabled={busy} onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>File name (optional)</span>
            <input className={inputCls} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} placeholder="Q3 Financial Report" />
          </label>
          <label className="block">
            <span className={labelCls}>Category</span>
            <select className={inputCls} value={category} disabled={busy} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        {step > 0 && <Steps labels={["Fingerprint", "Encrypt", "Store", "Blockchain"]} current={step} />}
        <Button type="submit" loading={busy} loadingText={step === 4 ? "Waiting for blockchain…" : "Processing…"}>Upload</Button>
      </div>
    </form>
  );
}