"use client";
import { useVault } from "@/context/VaultContext";
import { describeEvent } from "@/lib/events";
import { fmtStamp, short } from "@/lib/utils";
import DataTable, { Stack } from "@/components/ui/DataTable";

/** actor: names + "Performed by" (admin and audit). showRecord: block and transaction (audit history only). */
export default function ActivityTable({ events, actor = false, showRecord = false, empty = "No activity yet", pageSize = 10 }) {
  const { nameOf, youOf, fileName, loaded } = useVault();
  const ctx = { who: actor ? nameOf : youOf, file: fileName };

  const columns = [
    { key: "time", header: "Time", width: "w-48", render: (e) => <span className="tabular-nums">{fmtStamp(e.time)}</span> },
    {
      key: "text", header: "Activity", primary: true, wrap: "clamp",
      title: (e) => describeEvent(e, ctx),
      render: (e) => <span className="text-ink">{describeEvent(e, ctx)}</span>,
    },
    ...(actor ? [{ key: "by", header: "Performed by", width: "w-44", render: (e) => nameOf(e.from) }] : []),
    ...(showRecord ? [{ key: "tx", header: "Blockchain record", width: "w-52", render: (e) => <Stack title={`Block ${e.block}`} sub={short(e.tx)} /> }] : []),
  ];

  return <DataTable columns={columns} rows={events} rowKey={(e) => e.key} loading={!loaded} empty={empty} pageSize={pageSize} />;
}