"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { fmtStamp } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import PageTitle from "@/components/ui/PageTitle";
import Skeleton from "@/components/ui/Skeleton";

export default function InboxPage() {
  const router = useRouter();
  const { messages, read, markRead, loaded } = useVault();
  const fresh = useRef(new Set()); // messages that were unread when you opened the inbox

  useEffect(() => {
    if (!loaded) return;
    const unseen = messages.filter((m) => !read.has(m.key));
    unseen.forEach((m) => fresh.current.add(m.key));
    if (unseen.length) markRead(unseen.map((m) => m.key));
  }, [loaded, messages, read, markRead]);

  return (
    <div>
      <PageTitle title="Inbox" />
      {!loaded ? <Skeleton className="h-48" /> : messages.length === 0 ? <EmptyState title="No messages yet" /> : (
        <ol className="border border-white/10 bg-card">
          {messages.map((m) => (
            <li key={m.key} className="border-t border-white/5 first:border-0">
              <button
                onClick={() => router.push(m.href)}
                className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-white/[0.03] sm:px-5"
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${fresh.current.has(m.key) ? "bg-azure" : "bg-transparent"}`} />
                <span className="min-w-0 flex-1 text-sm leading-relaxed text-white/90">{m.text}</span>
                <span className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-white/55">{fmtStamp(m.time)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}