import toast from "react-hot-toast";
import { lastConfirmed } from "@/lib/tx";
import { short } from "@/lib/utils";

const REASONS = {
  "Admin only": "Only administrators can do this.",
  "Not an active member": "Your account isn't active in this organization.",
  "Only owner": "Only the file owner can do this.",
  "Edit access required": "You need edit access to add a new version.",
  "Recipient not active": "That person isn't an active member.",
  "Owner already has access": "The owner already has full access.",
  "No access": "You don't have access to this file.",
  "No such file": "This file doesn't exist or was deleted.",
  "Already resolved": "This request was already handled.",
  "Cannot change yourself": "You can't change your own account.",
  "Unknown user": "That user isn't registered.",
  "Bad address": "That wallet address isn't valid.",
  "Bad role": "Please choose a valid role.",
  "Bad level": "Please choose an access level.",
  "Bad recipients": "Choose between 1 and 25 people.",
  "Key must be 32 bytes": "Your encryption key was invalid. Please try again.",
  "Not shared with you": "This file hasn't been shared with you.",
  "File was deleted": "This file was deleted by its owner.",
  "You own this file": "You own this file.",
  "You already have this access": "You already have this level of access.",
  "Request already pending": "You already have a pending request for this file.",
  "Not in your files": "This file isn't in your files.",
  "Not shared with that person": "That person doesn't have this file.",
  "Download not allowed": "Your access doesn't include downloading.",
};

export function friendlyMessage(e) {
  if (typeof e === "string") return e;
  const code = e?.code ?? e?.error?.code ?? e?.info?.error?.code;
  const msg = String(e?.shortMessage || e?.message || "");

  if (code === 4001 || code === "ACTION_REJECTED" || /user rejected|user denied/i.test(msg))
    return "You cancelled the request in MetaMask. Nothing was changed.";
  if (code === -32002) return "A MetaMask request is already open. Open the extension to continue.";

  const reason =
    e?.reason ||
    msg.match(/execution reverted: "([^"]+)"/)?.[1] ||
    msg.match(/reverted with reason string '([^']+)'/)?.[1];
  if (reason && REASONS[reason]) return REASONS[reason];

  if (/insufficient funds/i.test(msg)) return "Not enough ETH to pay the network fee.";
  if (/nonce/i.test(msg))
    return "MetaMask is out of sync with the blockchain. In MetaMask open Settings → Advanced → Clear activity tab data, then try again.";
  if (code === "NETWORK_ERROR" || /failed to fetch|could not detect network/i.test(msg))
    return "Can't reach the blockchain network. Make sure it is running.";
  if (code === -32603 || /internal json-rpc/i.test(msg))
    return "The network rejected the request. If you restarted the local blockchain, reset MetaMask's activity data and redeploy.";

  // Plain Errors thrown by our own code (integrity failed, transaction failed, storage error…)
  if (e instanceof Error && !e.code && !e.shortMessage && msg && msg.length < 160) return msg;

  return "Something went wrong. Please try again.";
}

export const notify = {
  /** Shows the block number and transaction hash when the message follows a confirmed transaction. */
  success: (message) => {
    const c = lastConfirmed.current;
    lastConfirmed.current = null;
    if (c && Date.now() - c.at < 30000) {
      toast.success(
        <div>
          <p>{message}</p>
          <p className="mt-0.5 text-xs text-white/55">Confirmed in block {c.block} · {short(c.hash)}</p>
        </div>
      );
    } else {
      toast.success(message);
    }
  },
  error: (e) => {
    console.error(e);
    toast.error(friendlyMessage(e));
  },
};