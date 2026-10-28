import { deployed, ROLES, ACCESS } from "@/lib/contract";

export const eventLabel = (name) => name.replace(/([A-Z])/g, " $1").trim();

const poss = (name) => (name === "You" ? "your" : `${name}'s`);

// c = { who(address) → name, file(id) → file name }
const TEXT = {
  UserRegistered: (e) => `${e.args.name} was added as ${ROLES[e.args.role]} in ${e.args.department}`,
  UserUpdated: (e, c) => `${c.who(e.args.wallet)} updated: ${ROLES[e.args.role]}, ${e.args.department}${e.args.active === "true" ? "" : ", removed"}`,
  KeyRegistered: (e, c) => `${c.who(e.args.wallet)} created encryption keys`,
  FileUploaded: (e, c) => `${c.who(e.args.owner)} uploaded “${e.args.name}”`,
  FileShared: (e, c) => `${c.who(e.args.owner)} shared “${c.file(e.fileId)}” with ${c.who(e.args.user)} (${ACCESS[e.args.level]})`,
  AccessRevoked: (e, c) => `${c.who(e.args.owner)} revoked ${poss(c.who(e.args.user))} access to “${c.file(e.fileId)}”`,
  VersionAdded: (e, c) => `${c.who(e.args.editor)} added version ${e.args.version} to “${c.file(e.fileId)}”`,
  FileAccessed: (e, c) => `${c.who(e.args.user)} ${e.args.kind === "1" ? "downloaded" : "viewed"} “${c.file(e.fileId)}”`,
  FileVerified: (e, c) => `${c.who(e.args.user)} verified “${c.file(e.fileId)}”: ${e.args.matched === "true" ? "matched" : "not matched"}`,
  FileHidden: (e, c) => `${c.who(e.args.user)} removed “${c.file(e.fileId)}” from their files`,
  FileDeleted: (e, c) => `${c.who(e.args.by)} deleted “${c.file(e.fileId)}” for everyone`,
  AccessRequested: (e, c) => `${c.who(e.args.requester)} requested ${ACCESS[e.args.level]} access to “${c.file(e.fileId)}”`,
  RequestResolved: (e, c) =>
    `${c.who(e.args.owner)} ${e.args.approved === "true" ? "accepted" : "rejected"} ${poss(c.who(e.args.requester))} request for ${ACCESS[e.args.level]} access to “${c.file(e.fileId)}”`,
};

export const describeEvent = (e, ctx) => (TEXT[e.name] ? TEXT[e.name](e, ctx) : eventLabel(e.name));

// Incremental cache: after the first call only new blocks are read.
const cache = new Map();
const CHUNK = 2000; // keeps each log request small on public networks

async function sync(c, contract, provider) {
  const latest = await provider.getBlockNumber();
  while (c.next <= latest) {
    const to = Math.min(c.next + CHUNK - 1, latest);
    const logs = await provider.getLogs({ address: deployed.address, fromBlock: c.next, toBlock: to });

    const blocks = [...new Set(logs.map((l) => l.blockNumber))].filter((n) => c.times[n] === undefined);
    const hashes = [...new Set(logs.map((l) => l.transactionHash))].filter((h) => c.senders[h] === undefined);
    await Promise.all([
      ...blocks.map(async (n) => { c.times[n] = (await provider.getBlock(n)).timestamp; }),
      ...hashes.map(async (h) => { c.senders[h] = (await provider.getTransaction(h))?.from || ""; }),
    ]);

    for (const l of logs) {
      try {
        const p = contract.interface.parseLog(l);
        const args = Object.fromEntries(p.fragment.inputs.map((inp, i) => [inp.name, String(p.args[i])]));
        c.events.push({
          key: `${l.transactionHash}-${l.index}`, name: p.name, args, fileId: args.fileId ?? null,
          time: c.times[l.blockNumber], block: l.blockNumber, tx: l.transactionHash, from: c.senders[l.transactionHash],
        });
      } catch {}
    }
    c.next = to + 1;
  }
}

/** Every contract event, oldest first, with the block, time and the wallet that sent the transaction. */
export async function loadEvents(contract) {
  const provider = contract.runner.provider;
  let c = cache.get(deployed.address);
  if (!c) {
    c = { events: [], next: deployed.block || 0, times: {}, senders: {}, pending: null };
    cache.set(deployed.address, c);
  }
  if (!c.pending) c.pending = sync(c, contract, provider).finally(() => { c.pending = null; });
  await c.pending;
  return [...c.events];
}