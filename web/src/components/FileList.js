"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { CATEGORIES } from "@/lib/contract";
import { fmtSize, fmtStamp } from "@/lib/utils";
import Button from "@/components/ui/Button";
import DataTable, { Stack } from "@/components/ui/DataTable";
import FileIcon, { kindLabel } from "@/components/ui/FileIcon";
import { inputCls } from "@/components/ui/styles";

const SORTS = {
  newest: ["Newest first", (a, b) => b.time - a.time],
  oldest: ["Oldest first", (a, b) => a.time - b.time],
  az: ["Name A to Z", (a, b) => a.name.localeCompare(b.name)],
  za: ["Name Z to A", (a, b) => b.name.localeCompare(a.name)],
};

/** mode: "mine" (recorded time) or "shared" (sent time and sender) */
export default function FileList({ files, mode, onDelete, timeOf = (f) => f.createdAt, emptyTitle, loading = false }) {
  const { nameOf } = useVault();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("newest");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return files
      .map((f) => ({ ...f, time: timeOf(f) }))
      .filter((f) => cat === "All" || f.category === cat)
      .filter((f) => !term || f.name.toLowerCase().includes(term))
      .sort(SORTS[sort][1]);
  }, [files, q, cat, sort, timeOf]);

  const columns = [
    {
      key: "name", header: "Name", primary: true, title: (f) => f.name,
      render: (f) => <Stack icon={<FileIcon name={f.name} size="sm" />} title={f.name} sub={f.state === "deleted" ? "Deleted by owner" : kindLabel(f.name)} />,
    },
    { key: "category", header: "Category", width: "w-36", render: (f) => f.category },
    { key: "size", header: "Size", width: "w-28", align: "right", render: (f) => <span className="tabular-nums">{fmtSize(f.size)}</span> },
    { key: "time", header: mode === "mine" ? "Recorded" : "Sent", width: "w-48", render: (f) => <span className="tabular-nums">{f.time ? fmtStamp(f.time) : "–"}</span> },
    ...(mode === "shared" ? [{ key: "from", header: "From", width: "w-40", render: (f) => nameOf(f.owner) }] : []),
    {
      key: "del", header: "", width: "w-16", align: "right", actions: true, plain: true,
      render: (f) => (
        <button
          aria-label={`Delete ${f.name}`}
          onClick={(e) => { e.stopPropagation(); onDelete(f); }}
          className="p-2 text-ink-3 transition duration-150 hover:text-danger active:scale-90"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  const filtering = files.length > 0;

  return (
    <div>
      {filtering && !loading && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className={`${inputCls} pl-9`} placeholder="Search files" aria-label="Search files" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <select className={`${inputCls} sm:!w-44`} aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="All">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className={`${inputCls} sm:!w-40`} aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(f) => f.id}
        onRowClick={(f) => router.push(`/files/${f.id}`)}
        loading={loading}
        pageSize={10}
        empty={filtering ? "No files match your search" : emptyTitle}
        emptyAction={filtering ? <Button variant="secondary" onClick={() => { setQ(""); setCat("All"); }}>Clear filters</Button> : null}
      />
    </div>
  );
}