"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useVault } from "@/context/VaultContext";
import { ADMIN } from "@/lib/contract";
import { fmtSize, fmtStamp } from "@/lib/utils";
import ActivityTable from "@/components/ActivityTable";
import StatCard from "@/components/ui/StatCard";
import SectionTitle from "@/components/ui/SectionTitle";
import Tabs from "@/components/ui/Tabs";
import DataTable, { Stack } from "@/components/ui/DataTable";
import FileIcon, { kindLabel } from "@/components/ui/FileIcon";

export default function Dashboard() {
  const { profile } = useWallet();
  const v = useVault();
  const router = useRouter();
  const [tab, setTab] = useState("files");
  const loading = !v.loaded;

  if (profile.role === ADMIN) {
    const active = v.users.filter((u) => u.active);
    return (
      <div className="space-y-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Members" value={active.length} loading={loading} />
          <StatCard label="Managers" value={active.filter((u) => Number(u.role) === 2).length} loading={loading} />
          <StatCard label="Employees" value={active.filter((u) => Number(u.role) === 1).length} loading={loading} />
          <StatCard label="Activities" value={v.events.length} loading={loading} />
        </div>
        <section>
          <SectionTitle>Recent activity</SectionTitle>
          <ActivityTable events={[...v.events].reverse().slice(0, 10)} actor pageSize={0} />
        </section>
      </div>
    );
  }

  const received = v.shared.filter((f) => f.state === "active");
  const recent = [
    ...v.owned.map((f) => ({ ...f, time: f.createdAt })),
    ...received.map((f) => ({ ...f, time: v.sentAt[f.id] || f.createdAt })),
  ].sort((a, b) => b.time - a.time).slice(0, 10);

  const columns = [
    {
      key: "name", header: "Name", primary: true, title: (f) => f.name,
      render: (f) => <Stack icon={<FileIcon name={f.name} size="sm" />} title={f.name} sub={kindLabel(f.name)} />,
    },
    { key: "from", header: "From", width: "w-40", render: (f) => (f.mine ? "You" : v.nameOf(f.owner)) },
    { key: "category", header: "Category", width: "w-36", render: (f) => f.category },
    { key: "size", header: "Size", width: "w-28", align: "right", render: (f) => <span className="tabular-nums">{fmtSize(f.size)}</span> },
    { key: "time", header: "Time", width: "w-48", render: (f) => <span className="tabular-nums">{fmtStamp(f.time)}</span> },
  ];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Files I own" value={v.owned.length} loading={loading} />
        <StatCard label="Received from others" value={received.length} loading={loading} />
        <StatCard label="Pending requests" value={v.incoming.length} loading={loading} />
      </div>

      <section>
        <Tabs value={tab} onChange={setTab} tabs={[["files", "Recent files"], ["activity", "Recent activity"]]} />
        {tab === "files" ? (
          <DataTable
            columns={columns}
            rows={recent}
            rowKey={(f) => `${f.mine ? "m" : "r"}-${f.id}`}
            onRowClick={(f) => router.push(`/files/${f.id}`)}
            loading={loading}
            skeletonRows={4}
            empty="No files yet"
          />
        ) : (
          <ActivityTable events={v.myActivity.slice(0, 50)} />
        )}
      </section>
    </div>
  );
}