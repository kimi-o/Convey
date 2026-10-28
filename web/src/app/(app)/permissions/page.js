"use client";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { ACCESS, accessLabel } from "@/lib/contract";
import { unwrapKey, wrapKey } from "@/lib/crypto";
import { expiryFromDays, fmtStamp, sameAddr } from "@/lib/utils";
import { notify } from "@/lib/notify";
import ActivityTable from "@/components/ActivityTable";
import RequestModal from "@/components/RequestModal";
import Button from "@/components/ui/Button";
import DataTable, { Stack } from "@/components/ui/DataTable";
import FileIcon from "@/components/ui/FileIcon";
import PageTitle from "@/components/ui/PageTitle";
import Tabs from "@/components/ui/Tabs";
import { inputCls } from "@/components/ui/styles";

const HISTORY = ["AccessRequested", "RequestResolved"];

export default function Permissions() {
  const { contract, account, unlockKeys } = useWallet();
  const { received, incoming, outgoing, events, filesById, userBy, nameOf, refresh, loaded } = useVault();
  const [tab, setTab] = useState("ask");
  const [asking, setAsking] = useState(null);
  const [working, setWorking] = useState("");
  const [days, setDays] = useState({});

  const pendingFor = new Set(outgoing.filter((r) => r.status === 0).map((r) => r.fileId));
  const mine = (a) => sameAddr(a, account);
  const history = events
    .filter((e) => HISTORY.includes(e.name) &&
      (mine(e.args.requester)|| filesById[e.fileId]?.mine))
    .reverse();

  async function accept(r) {
    setWorking(`a${r.id}`);
    try {
      const u = userBy[r.requester.toLowerCase()];
      if (!u || u.encKey.length !== 66) { notify.error(`${nameOf(r.requester)} needs to sign in once to create their encryption keys.`); return; }
      const kp = await unlockKeys();
      const mineGrant = await contract.getMyGrant(r.fileId);
      const key = unwrapKey(mineGrant.wrappedKey, kp.secretKey);
      await (await contract.resolveRequest(r.id, true, expiryFromDays(days[r.id] || 0), wrapKey(key, u.encKey))).wait();
      await refresh();
      notify.success(`${nameOf(r.requester)} now has ${ACCESS[r.level]} access.`);
    } catch (e) { notify.error(e); } finally { setWorking(""); }
  }

  async function reject(r) {
    setWorking(`r${r.id}`);
    try {
      await (await contract.resolveRequest(r.id, false, 0, "0x")).wait();
      await refresh();
      notify.success("Request rejected.");
    } catch (e) { notify.error(e); } finally { setWorking(""); }
  }

  const askColumns = [
    {
      key: "file", header: "File", primary: true, title: (f) => f.name,
      render: (f) => <Stack icon={<FileIcon name={f.name} size="sm" />} title={f.name} sub={`From ${nameOf(f.owner)}`} />,
    },
    { key: "perm", header: "Granted permission", width: "w-48", render: (f) => <span className={f.level > 0 ? "text-ink" : "text-ink-3"}>{accessLabel(f)}</span> },
    {
      key: "act", header: "", width: "w-44", align: "right", actions: true, plain: true,
      render: (f) => pendingFor.has(f.id) ? <span className="text-xs text-ink-3">Request pending</span>
        : f.level >= 3 ? <span className="text-xs text-ink-3">Full access</span>
        : <Button variant="secondary" size="sm" onClick={() => setAsking(f)}>Request more</Button>,
    },
  ];

  const grantColumns = [
    {
      key: "file", header: "File and requester", width: "w-[28%]", primary: true, title: (r) => r.file.name,
      render: (r) => <Stack title={r.file.name} sub={`${nameOf(r.requester)}, ${fmtStamp(r.ts)}`} />,
    },
    {
      key: "change", header: "Permission change", width: "w-48",
      render: (r) => <span>{r.fromLevel ? ACCESS[r.fromLevel] : "None"} <span className="text-ink-3">to</span> <span className="text-ink">{ACCESS[r.level]}</span></span>,
    },
    { key: "reason", header: "Reason", wrap: "clamp", wide: true, title: (r) => r.reason, render: (r) => r.reason },
    {
      key: "period", header: "Access period", width: "w-44", plain: true,
      render: (r) => (
        <select className={`${inputCls} !w-full`} aria-label="Access period" value={days[r.id] || 0} onChange={(e) => setDays({ ...days, [r.id]: Number(e.target.value) })}>
          <option value={0}>Never expires</option><option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option>
        </select>
      ),
    },
    {
      key: "act", header: "", width: "w-52", plain: true, wide: true,
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" disabled={!!working} loading={working === `a${r.id}`} loadingText="Confirming" onClick={() => accept(r)}>Accept</Button>
          <Button variant="secondary" size="sm" disabled={!!working} loading={working === `r${r.id}`} loadingText="Confirming" onClick={() => reject(r)}>Reject</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageTitle title="Permissions" />
      <Tabs value={tab} onChange={setTab} tabs={[["ask", "Ask for permission"], ["grant", "Grant permission", incoming.length], ["history", "History"]]} />

      {tab === "ask" && (
        <>
          <DataTable columns={askColumns} rows={received} rowKey={(f) => f.id} loading={!loaded} pageSize={10} empty="No received files yet" />
          {asking && <RequestModal file={asking} onClose={() => setAsking(null)} />}
        </>
      )}
      {tab === "grant" && (
        <DataTable columns={grantColumns} rows={incoming} rowKey={(r) => r.id} loading={!loaded} pageSize={10} empty="No requests waiting for you" />
      )}
      {tab === "history" && <ActivityTable events={history} empty="No permission activity yet" />}
    </div>
  );
}