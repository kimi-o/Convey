import toast from "react-hot-toast";
import { short } from "@/lib/utils";

export const lastConfirmed = { current: null };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Waits until the wallet's connection reports the block that holds our transaction, so the next read is fresh. */
async function waitForBlock(provider, blockNumber) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    try { if ((await provider.getBlockNumber()) >= blockNumber) return; } catch { return; }
    await sleep(500);
  }
}

async function confirmTx(tx, provider) {
  const id = toast.loading(`Waiting for blockchain confirmation · ${short(tx.hash)}`);
  try {
    let receipt;
    try {
      receipt = await withTimeout(
        tx.wait(), 180000,
        "The transaction is taking longer than expected. Check MetaMask; it may still confirm."
      );
    } catch (e) {
      // "Speed up" in MetaMask replaces the transaction with the same action: still a success
      if (e?.code === "TRANSACTION_REPLACED" && e.reason === "repriced" && e.receipt) receipt = e.receipt;
      else throw e;
    }
    if (!receipt || receipt.status !== 1) throw new Error("The transaction failed on the blockchain.");
    await waitForBlock(provider, receipt.blockNumber);
    lastConfirmed.current = { hash: receipt.hash, block: receipt.blockNumber, at: Date.now() };
    return receipt;
  } finally {
    toast.dismiss(id);
  }
}

/** Every state-changing contract call returns { hash, wait() }. wait() resolves only for a mined, successful transaction. */
export function wrapWrites(contract, writeNames) {
  const writes = new Set(writeNames);
  return new Proxy(contract, {
    get(target, prop) {
      if (typeof prop === "string" && writes.has(prop)) {
        return async (...args) => {
          const prompt = toast.loading("Confirm the transaction in MetaMask…");
          let tx;
          try { tx = await target[prop](...args); } finally { toast.dismiss(prompt); }
          return { hash: tx.hash, wait: () => confirmTx(tx, target.runner.provider) };
        };
      }
      return target[prop];
    },
  });
}