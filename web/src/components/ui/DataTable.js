"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

/** Two-line cell: white title, pale subtitle. Both truncate, so every row keeps the same height. */
export function Stack({ title, sub, icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {icon}
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{title}</p>
        {sub && <p className="truncate text-xs text-ink-3">{sub}</p>}
      </div>
    </div>
  );
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

/**
 * columns: [{ key, header, width, align, primary, actions, plain, wrap, wide, hideOnMobile, render(row), title(row) }]
 *  width     fixed width class (e.g. "w-40"); leave one column without width so it takes the remaining space
 *  primary   the title of the card on small screens
 *  actions   shown top-right of the card on small screens
 *  plain     content is not clipped (buttons, inputs, selects)
 *  wrap      "clamp" allows two lines
 *  wide      spans both columns inside a card
 */
export default function DataTable({
  columns, rows, rowKey, onRowClick, loading = false, empty = "Nothing to show", emptyAction,
  pageSize = 0, skeletonRows = 6,
}) {
  const [page, setPage] = useState(0);
  const total = rows.length;
  const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  useEffect(() => { setPage((p) => Math.min(p, pages - 1)); }, [pages]);

  if (!loading && total === 0) return <EmptyState title={empty}>{emptyAction}</EmptyState>;

  const visible = pageSize ? rows.slice(page * pageSize, (page + 1) * pageSize) : rows;
  const primary = columns.find((c) => c.primary) || columns[0];
  const actions = columns.find((c) => c.actions);
  const rest = columns.filter((c) => c !== primary && c !== actions && !c.hideOnMobile);
  const rowProps = (row) =>
    onRowClick
      ? { tabIndex: 0, onClick: () => onRowClick(row), onKeyDown: (e) => { if (e.key === "Enter") onRowClick(row); } }
      : {};

  return (
    <div className="border border-white/10 bg-card">
      {/* Large screens: fixed columns, fixed row height */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full table-fixed">
          <colgroup>{columns.map((c) => <col key={c.key} className={c.width} />)}</colgroup>
          <thead>
            <tr className="h-11">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 text-xs font-medium text-ink-3 ${ALIGN[c.align || "left"]}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="h-14 border-t border-white/5">
                    {columns.map((c, j) => (
                      <td key={c.key} className="px-4">
                        <Skeleton className={`h-3 ${j === 0 ? "w-3/5" : "w-2/5"} ${c.align === "right" ? "ml-auto" : ""}`} />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((row) => (
                  <tr
                    key={rowKey(row)}
                    {...rowProps(row)}
                    className={`h-14 border-t border-white/5 transition-colors duration-150 ${onRowClick ? "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05]" : ""}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} title={c.title ? c.title(row) : undefined} className={`px-4 align-middle text-sm text-ink-2 ${ALIGN[c.align || "left"]}`}>
                        <div className={c.plain ? "" : c.wrap === "clamp" ? "line-clamp-2 break-words leading-5" : "truncate"}>{c.render(row)}</div>
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Small screens: one card per row, nothing scrolls sideways */}
      <ul className="lg:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-3 border-t border-white/5 p-4 first:border-0">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </li>
            ))
          : visible.map((row) => (
              <li
                key={rowKey(row)}
                {...rowProps(row)}
                className={`border-t border-white/5 p-4 first:border-0 ${onRowClick ? "cursor-pointer active:bg-white/[0.04]" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-sm text-ink">{primary.render(row)}</div>
                  {actions && <div className="shrink-0" onClick={(e) => e.stopPropagation()}>{actions.render(row)}</div>}
                </div>
                {rest.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                    {rest.map((c) => (
                      <div key={c.key} className={`min-w-0 ${c.wide ? "col-span-2" : ""}`}>
                        <dt className="text-xs text-ink-3">{c.header}</dt>
                        <dd className="mt-0.5 break-words text-sm text-ink-2">{c.render(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
      </ul>

      {pageSize > 0 && total > pageSize && !loading && (
        <div className="flex h-12 items-center justify-between border-t border-white/10 px-4 text-xs text-ink-3">
          <span className="tabular-nums">{page * pageSize + 1} to {Math.min(total, (page + 1) * pageSize)} of {total}</span>
          <div className="flex items-center gap-1">
            <button aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 transition-colors duration-150 hover:text-white disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <button aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="p-1.5 transition-colors duration-150 hover:text-white disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}