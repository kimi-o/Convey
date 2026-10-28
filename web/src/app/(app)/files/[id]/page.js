"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, Download, Share2, Trash2, KeyRound, ArrowLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { ACCESS, accessLabel } from "@/lib/contract";
import { sha256Hex, decryptBuffer, encryptBuffer, unwrapKey } from "@/lib/crypto";
import { downloadEncrypted, uploadEncrypted } from "@/lib/ipfs";
import { fmtExpiry, fmtSize, fmtStamp, isExpired, short } from "@/lib/utils";
import { notify } from "@/lib/notify";
import ShareModal from "@/components/ShareModal";
import RequestModal from "@/components/RequestModal";
import DeleteModal from "@/components/DeleteModal";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import Button, { buttonClass } from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";
import DataTable, { Stack } from "@/components/ui/DataTable";
import FileIcon, { kindLabel } from "@/components/ui/FileIcon";

function Item({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

export default function FileDetail() {
  const { id } = useParams();
  const fileId = Number(id);
  const router = useRouter();
  const { contract, unlockKeys } = useWallet();
  const { filesById, loaded, nameOf, userBy, refresh } = useVault();

  const file = filesById[fileId];
  const hasAccess = !!file && file.level > 0;
  const isOwner = !!file && file.mine;

  const [versions, setVersions] = useState([]);
  const [access, setAccess] = useState([]);
  const [verified, setVerified] = useState(null);
  const [preview, setPreview] = useState(null);
  const [warn, setWarn] = useState(false);
  const [modal, setModal] = useState(null); // share | delete | request
  const [action, setAction] = useState(null);
  const [phase, setPhase] = useState("");

  const loadDetails = useCallback(async () => {
    if (!hasAccess) { setVersions([]); setAccess([]); return; }
    const raw = await contract.getVersions(fileId);
    // read every field explicitly: spreading the blockchain result would drop the named fields
    setVersions([...raw].map((v, i) => ({
      n: i + 1, cid: v.cid, fileHash: v.fileHash, size: Number(v.size),
      uploader: v.uploader, timestamp: Number(v.timestamp),
    })));
    setAccess(isOwner ? [...(await contract.getAccessList(fileId))] : []);
  }, [contract, fileId, hasAccess, isOwner]);

  useEffect(() => { loadDetails().catch(console.error); }, [loadDetails]);

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  /** View / Download: 1) blockchain transaction  2) verify against the recorded fingerprint  3) show or save */
  async function open(mode) {
    setAction(mode);
    setPhase("Confirm in MetaMask");
    try {
      const kp = await unlockKeys();
      const list = versions.length ? versions : [...(await contract.getVersions(fileId))];
      const latest = list[list.length - 1];

      await (await contract.recordAccess(fileId, mode === "download" ? 1 : 0)).wait();

      setPhase("Verifying file");
      const grant = await contract.getMyGrant(fileId);
      const key = unwrapKey(grant.wrappedKey, kp.secretKey);
      const enc = await downloadEncrypted(latest.cid);
      let plain = null;
      try { plain = await decryptBuffer(enc, key); } catch {}
      const ok = !!plain && (await sha256Hex(plain)).toLowerCase() === latest.fileHash.toLowerCase();
      setVerified(ok);
      if (!ok) { setWarn(true); return; }

      const type = file.fileType.includes("/") ? file.fileType : "application/octet-stream";
      if (mode === "download") {
        const url = URL.createObjectURL(new Blob([plain], { type }));
        const a = document.createElement("a");
        a.href = url; a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        notify.success("File verified and downloaded.");
      } else {
        closePreview();
        const isText = type.startsWith("text/") || type === "application/json";
        setPreview({
          type,
          url: isText ? null : URL.createObjectURL(new Blob([plain], { type })),
          text: isText ? new TextDecoder().decode(plain).slice(0, 20000) : null,
        });
        notify.success("File verified.");
      }
    } catch (e) {
      notify.error(e);
    } finally {
      setAction(null);
    }
  }

  async function addVersion(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setAction("version");
    try {
      const kp = await unlockKeys();
      const grant = await contract.getMyGrant(fileId);
      const key = unwrapKey(grant.wrappedKey, kp.secretKey); // the same file key is reused for every version
      const buf = await f.arrayBuffer();
      const hash = await sha256Hex(buf);
      const cid = await uploadEncrypted(await encryptBuffer(buf, key), f.name);
      await (await contract.addVersion(fileId, cid, hash, f.size)).wait();
      await Promise.all([loadDetails(), refresh()]);
      notify.success("New version added.");
    } catch (err) {
      notify.error(err);
    } finally {
      setAction(null);
    }
  }

  async function revoke(user) {
    setAction(`revoke:${user}`);
    try {
      await (await contract.revokeAccess(fileId, user)).wait();
      await Promise.all([loadDetails(), refresh()]);
      notify.success(`Access revoked for ${nameOf(user)}.`);
    } catch (e) {
      notify.error(e);
    } finally {
      setAction(null);
    }
  }

  if (!loaded) return <DetailSkeleton />;
  if (!file) return <p className="text-sm text-ink-3">This file doesn't exist, or hasn't been shared with you.</p>;

  const busy = !!action;
  const latest = versions[versions.length - 1];
  const accessText = `${accessLabel(file)}${!file.mine && file.expiry && file.level > 0 ? `, until ${fmtStamp(file.expiry)}` : ""}`;

  const integrity =
    !hasAccess ? <span className="text-ink-3">–</span>
    : verified === true ? <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Verified</span>
    : verified === false ? <span className="inline-flex items-center gap-1.5 text-danger"><ShieldAlert size={14} /> Mismatch</span>
    : <span className="text-ink-3">Not checked yet</span>;

  const versionColumns = [
    {
      key: "v", header: "Version", width: "w-40", primary: true,
      render: (v) => <span className="text-ink">v{v.n}{v.n === versions.length && <span className="ml-2 text-xs text-ink-3">current</span>}</span>,
    },
    { key: "by", header: "Added by", render: (v) => nameOf(v.uploader) },
    { key: "at", header: "Recorded", width: "w-52", render: (v) => <span className="tabular-nums">{fmtStamp(v.timestamp)}</span> },
    { key: "size", header: "Size", width: "w-28", align: "right", render: (v) => <span className="tabular-nums">{fmtSize(v.size)}</span> },
  ];

  const accessColumns = [
    {
      key: "who", header: "Person", primary: true,
      render: (a) => <Stack title={userBy[a.user.toLowerCase()]?.name || "Unknown member"} sub={userBy[a.user.toLowerCase()]?.department} />,
    },
    { key: "perm", header: "Permission", width: "w-36", render: (a) => ACCESS[Number(a.level)] },
    {
      key: "exp", header: "Expires", width: "w-56",
      render: (a) => <span className="tabular-nums">{fmtExpiry(a.expiry)}{isExpired(a.expiry) && <span className="ml-2 text-ink-3">expired</span>}</span>,
    },
    {
      key: "act", header: "", width: "w-28", align: "right", actions: true, plain: true,
      render: (a) => (
        <Button variant="dangerGhost" size="sm" disabled={busy} onClick={() => revoke(a.user)} loading={action === `revoke:${a.user}`} loadingText="Revoking">
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <button onClick={() => router.back()} className="-mb-2 inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors duration-150 hover:text-azure">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header: identity on the left, actions on the right */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <FileIcon name={file.name} size="lg" />
          <div className="min-w-0">
            <h1 className="break-words font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">{file.name}</h1>
            <p className="mt-1 text-sm text-ink-3">{kindLabel(file.name)}, {fmtSize(file.size)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
          {hasAccess && (
            <Button disabled={busy} loading={action === "view"} loadingText={phase} onClick={() => open("view")}>
              <Eye size={15} /> View
            </Button>
          )}
          {!isOwner && file.level >= 2 && (
            <Button variant="secondary" disabled={busy} loading={action === "download"} loadingText={phase} onClick={() => open("download")}>
              <Download size={15} /> Download
            </Button>
          )}
          {isOwner && (
            <Button variant="secondary" disabled={busy} onClick={() => setModal("share")}><Share2 size={15} /> Share</Button>
          )}
          {!isOwner && file.isActive && file.level < 3 && (
            <Button variant="secondary" disabled={busy} onClick={() => setModal("request")}><KeyRound size={15} /> Request permission</Button>
          )}
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
          <Button variant="dangerGhost" className="col-span-2 sm:col-auto" disabled={busy} onClick={() => setModal("delete")}>
            <Trash2 size={15} /> {isOwner ? "Delete" : "Remove"}
          </Button>
        </div>
      </header>

      {file.state === "deleted" && <Notice tone="alert" title="This file was deleted">{nameOf(file.owner)} deleted it for everyone.</Notice>}
      {file.state === "revoked" && <Notice tone="warn" title="Your access was revoked">Request permission again if you still need this file.</Notice>}
      {file.state === "expired" && <Notice tone="warn" title="Your access expired">It ended on {fmtStamp(file.expiry)}. Request permission again if you still need this file.</Notice>}

      {/* File details box */}
      <section aria-label="File details" className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-medium text-ink">File details</h2>
        </div>
        <dl className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          <Item label="Type">{kindLabel(file.name)}</Item>
          <Item label="Category">{file.category}</Item>
          <Item label="Size">{fmtSize(file.size)}</Item>
          <Item label="Owner">{file.mine ? `${nameOf(file.owner)} (you)` : nameOf(file.owner)}</Item>
          <Item label="Uploaded">{fmtStamp(file.createdAt)}</Item>
          <Item label="Last updated">{fmtStamp(latest ? latest.timestamp : file.createdAt)}</Item>
          <Item label="Versions">{hasAccess ? versions.length : "–"}</Item>
          <Item label="Your access">{accessText}</Item>
          <Item label="Integrity">{integrity}</Item>
        </dl>
      </section>

      {preview && (
        <section aria-label="Preview" className="border border-white/10 bg-card">
          <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
            <h2 className="text-sm font-medium text-ink">Preview</h2>
            <button onClick={closePreview} className="text-sm text-ink-3 transition-colors duration-150 hover:text-azure">Close</button>
          </div>
          <div className="p-3">
            {preview.text !== null ? <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-3 text-sm text-ink-2">{preview.text}</pre>
              : preview.type === "application/pdf" ? <iframe src={preview.url} title="Preview" className="h-[70vh] w-full" />
              : preview.type.startsWith("image/") ? <img src={preview.url} alt="" className="mx-auto max-h-[70vh] max-w-full" />
              : <p className="p-6 text-center text-sm text-ink-3">No preview is available for this file type.</p>}
          </div>
        </section>
      )}

      {hasAccess && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle>Versions</SectionTitle>
            {file.level >= 3 && (
              <label className={buttonClass("secondary", `cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`, "sm")}>
                {action === "version" ? "Waiting for confirmation" : "Add new version"}
                <input type="file" className="hidden" disabled={busy} onChange={addVersion} />
              </label>
            )}
          </div>
          <DataTable columns={versionColumns} rows={[...versions].reverse()} rowKey={(v) => v.n} loading={versions.length === 0} skeletonRows={2} empty="No versions" />
        </section>
      )}

      {isOwner && hasAccess && (
        <section>
          <SectionTitle>Shared with</SectionTitle>
          <DataTable columns={accessColumns} rows={access} rowKey={(a) => a.user} empty="Not shared with anyone yet" />
        </section>
      )}

      {modal === "share" && <ShareModal file={file} onDone={loadDetails} onClose={() => setModal(null)} />}
      {modal === "request" && <RequestModal file={file} onClose={() => setModal(null)} />}
      {modal === "delete" && <DeleteModal file={file} onDone={() => router.push(isOwner ? "/files" : "/shared")} onClose={() => setModal(null)} />}

      {warn && (
        <Modal title="This file does not match its record" onClose={() => setWarn(false)}>
          <p className="text-sm leading-relaxed text-ink-2">
            The contents do not match the record kept for this file. It may have been
            <span className="text-danger"> altered or could be harmful</span>. Do not open or forward it, and tell the owner and your administrator.
          </p>
          <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setWarn(false)}>Close</Button></div>
        </Modal>
      )}
    </div>
  );
}