"use client";
import { useRef, useState } from "react";
import { ethers } from "ethers";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { deployed } from "@/lib/contract";
import { decryptBuffer, sha256Hex, unwrapKey } from "@/lib/crypto";
import { downloadEncrypted } from "@/lib/ipfs";
import { fmtStamp, short } from "@/lib/utils";
import { notify } from "@/lib/notify";
import Button from "@/components/ui/Button";
import DataTable, { Stack } from "@/components/ui/DataTable";
import FileIcon from "@/components/ui/FileIcon";
import Notice from "@/components/ui/Notice";
import PageTitle from "@/components/ui/PageTitle";
import SectionTitle from "@/components/ui/SectionTitle";

const HAS_VERIFY_FN = deployed.abi.some((f) => f.type === "function" && f.name === "verifyFile");

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-white/5 py-3 first:border-0 first:pt-0">
      <dt className="shrink-0 text-sm text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

const Hash = ({ label, value }) => (
  <div className="border-t border-white/5 py-3">
    <dt className="text-sm text-ink-3">{label}</dt>
    <dd className="mt-1.5 select-all break-all font-mono text-[11px] leading-relaxed text-ink-2">{value}</dd>
  </div>
);

export default function Verification() {
  const { contract, unlockKeys } = useWallet();
  const { owned, shared, nameOf, refresh, loaded } = useVault();
  const [busy, setBusy] = useState(null); // { id, phase, copy }
  const [results, setResults] = useState({});
  const [report, setReport] = useState(null);
  const picker = useRef(null);
  const target = useRef(null);

  const files = [
    ...owned.map((f) => ({ ...f, source: "My file" })),
    ...shared.filter((f) => f.state === "active").map((f) => ({ ...f, source: "Received" })),
  ];

  /** copyFile given → check that copy from this computer. Otherwise → check the stored file. */
  async function verify(f, copyFile) {
    const copy = !!copyFile;
    setBusy({ id: f.id, copy, phase: copy ? "Reading your copy" : "Checking file" });
    try {
      const versions = [...(await contract.getVersions(f.id))];
      const latest = versions[versions.length - 1];

      // Fingerprint of what is being checked (zero if the stored file is missing or cannot be decrypted)
      let computed = ethers.ZeroHash;
      if (copy) {
        computed = await sha256Hex(await copyFile.arrayBuffer());
      } else {
        const kp = await unlockKeys();
        const grant = await contract.getMyGrant(f.id);
        const key = unwrapKey(grant.wrappedKey, kp.secretKey);
        try { computed = await sha256Hex(await decryptBuffer(await downloadEncrypted(latest.cid), key)); } catch {}
      }

      // The blockchain transaction
      setBusy({ id: f.id, copy, phase: "Confirm in MetaMask" });
      let receipt, matched;
      if (HAS_VERIFY_FN) {
        receipt = await (await contract.verifyFile(f.id, computed)).wait();
        const parsed = receipt.logs
          .map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } })
          .find((p) => p?.name === "FileVerified");
        matched = !!parsed?.args.matched; // decided by the contract
      } else {
        receipt = await (await contract.recordAccess(f.id, 0)).wait();
        matched = computed.toLowerCase() === latest.fileHash.toLowerCase();
      }

      const block = await contract.runner.provider.getBlock(receipt.blockNumber);
      setResults((r) => ({ ...r, [f.id]: { matched, copy } }));
      setReport({
        file: f, matched, copy, copyName: copy ? copyFile.name : null, version: versions.length,
        recorded: latest.fileHash, computed, at: block.timestamp, block: receipt.blockNumber, tx: receipt.hash,
      });
      await refresh();
    } catch (e) {
      notify.error(e);
    } finally {
      setBusy(null);
    }
  }

  function chooseCopy(f) {
    target.current = f;
    picker.current?.click();
  }

  function onPick(e) {
    const copyFile = e.target.files[0];
    e.target.value = "";
    if (copyFile && target.current) verify(target.current, copyFile);
  }

  const columns = [
    {
      key: "file", header: "File", primary: true, title: (f) => f.name,
      render: (f) => <Stack icon={<FileIcon name={f.name} size="sm" />} title={f.name} sub={f.source === "Received" ? `From ${nameOf(f.owner)}` : "Uploaded by you"} />,
    },
    { key: "at", header: "Recorded", width: "w-48", render: (f) => <span className="tabular-nums">{fmtStamp(f.createdAt)}</span> },
    {
      key: "result", header: "Result", width: "w-44",
      render: (f) => {
        const r = results[f.id];
        if (!r) return <span className="text-ink-3">Not checked</span>;
        return (
          <Stack
            title={r.matched
              ? <span className="inline-flex items-center gap-1.5 text-ink"><ShieldCheck size={14} /> Matched</span>
              : <span className="inline-flex items-center gap-1.5 text-danger"><ShieldAlert size={14} /> Not matched</span>}
            sub={r.copy ? "Your copy" : "Stored file"}
          />
        );
      },
    },
    {
      key: "act", header: "", width: "w-72", plain: true, wide: true,
      render: (f) => (
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="secondary" size="sm" disabled={!!busy} loading={busy?.id === f.id && !busy.copy} loadingText={busy?.phase} onClick={() => verify(f)}>
            Verify
          </Button>
          <Button variant="secondary" size="sm" disabled={!!busy} loading={busy?.id === f.id && busy.copy} loadingText={busy?.phase} onClick={() => chooseCopy(f)}>
            Check a copy
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageTitle title="Verification" />
      <input ref={picker} type="file" className="hidden" onChange={onPick} />
      <DataTable columns={columns} rows={files} rowKey={(f) => `${f.source}-${f.id}`} loading={!loaded} pageSize={10} empty="No files to verify yet" />

      {report && (
        <section className="mt-10" aria-label="Verification report">
          <SectionTitle>Verification report</SectionTitle>
          <div className="space-y-4">
            <Notice tone={report.matched ? "info" : "alert"} title={report.matched ? "Matched" : "Not matched"}>
              {report.matched
                ? report.copy
                  ? "Your copy is identical to the latest version recorded on the blockchain."
                  : "The stored file is identical to the version recorded on the blockchain."
                : report.copy
                  ? "Your copy differs from the latest recorded version. It has been changed since it was uploaded, or it is a different file. Do not trust or forward it."
                  : "The stored file differs from the recorded version, or it could not be read. It may have been altered. Do not open or forward it."}
            </Notice>
            <dl className="border border-white/10 bg-card p-5 sm:p-6">
              <Row label="File">{report.file.name}</Row>
              <Row label="Checked">{report.copy ? `Your copy (${report.copyName})` : "Stored file"}</Row>
              <Row label="Compared with">Latest version (v{report.version})</Row>
              <Row label="Verified on">{fmtStamp(report.at)}</Row>
              <Row label="Recorded in block">{report.block}</Row>
              <Row label="Transaction"><span className="font-mono text-xs">{short(report.tx)}</span></Row>
              <Hash label="Recorded fingerprint (SHA-256)" value={report.recorded} />
              <Hash label="Fingerprint of what was checked (SHA-256)" value={report.computed === ethers.ZeroHash ? "The file could not be read" : report.computed} />
            </dl>
          </div>
        </section>
      )}
    </div>
  );
}