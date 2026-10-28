import { ACCESS } from "@/lib/contract";
import { sameAddr } from "@/lib/utils";

/** Inbox messages for one person, built from blockchain events. Newest first. */
export function buildMessages(events, { account, nameOf, fileName, filesById }) {
  const me = (a) => sameAddr(a, account);
  // An accepted request also emits "file shared": show only the acceptance message
  const acceptedTx = new Set(events.filter((e) => e.name === "RequestResolved" && e.args.approved === "true").map((e) => e.tx));
  const out = [];

  for (const e of events) {
    const a = e.args;
    const q = `“${fileName(e.fileId)}”`;
    const base = { key: e.key, time: e.time, fileId: Number(e.fileId) };

    if (e.name === "FileShared" && me(a.user) && !acceptedTx.has(e.tx)) {
      out.push({ ...base, type: "file", text: `You received a new file ${q} from ${nameOf(a.owner)} (${ACCESS[a.level]} access)`, href: `/files/${e.fileId}` });
    } else if (e.name === "RequestResolved" && me(a.requester)) {
      const yes = a.approved === "true";
      out.push({ ...base, type: "permission", text: `${nameOf(a.owner)} ${yes ? "accepted" : "rejected"} your request for ${ACCESS[a.level]} access to ${q}`, href: yes ? `/files/${e.fileId}` : "/permissions" });
    } else if (e.name === "AccessRevoked" && me(a.user)) {
      out.push({ ...base, type: "revoked", text: `${nameOf(a.owner)} revoked your access to ${q}`, href: "/permissions" });
    } else if (e.name === "AccessRequested" && filesById[e.fileId]?.mine) {
      out.push({ ...base, type: "permission", text: `${nameOf(a.requester)} requested ${ACCESS[a.level]} access to ${q}`, href: "/permissions" });
    } else if (e.name === "FileDeleted" && !me(a.by) && filesById[e.fileId]) {
      out.push({ ...base, type: "revoked", text: `${nameOf(a.by)} deleted ${q}`, href: "/shared" });
    }
  }
  return out.reverse();
}