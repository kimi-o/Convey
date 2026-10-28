import { ethers } from "ethers";
import deployed from "@/contracts/blockapp.json";
import { wrapWrites } from "@/lib/tx";

export { deployed };
export const ROLES = ["None", "Employee", "Manager", "Admin"];
export const ACCESS = ["None", "View", "Download", "Edit"];
export const EMPLOYEE = 1;
export const MANAGER = 2;
export const ADMIN = 3;
export const CATEGORIES = ["Report", "Sheet", "Proposal", "Idea", "Policy", "Other"];

const WRITES = deployed.abi
  .filter((f) => f.type === "function" && f.stateMutability !== "view" && f.stateMutability !== "pure")
  .map((f) => f.name);

export const getContract = (runner) =>
  wrapWrites(new ethers.Contract(deployed.address, deployed.abi, runner), WRITES);

/** Contract MyFile struct → plain object with a `state`: owned | active | expired | revoked | deleted */
export function toMyFile(f, account) {
  const level = Number(f.level);
  const expiry = Number(f.expiry);
  const mine = f.owner.toLowerCase() === account.toLowerCase();
  let state = "active";
  if (mine) state = "owned";
  else if (!f.isActive) state = "deleted";
  else if (f.revoked) state = "revoked";
  else if (level === 0 && expiry !== 0) state = "expired";
  return {
    id: Number(f.id), name: f.name, fileType: f.fileType, category: f.category, size: Number(f.size),
    owner: f.owner, createdAt: Number(f.createdAt), isActive: f.isActive,
    level, expiry, revoked: f.revoked, mine, state,
  };
}

export const accessLabel = (f) =>
  f.mine ? "Owner"
  : f.state === "revoked" ? "Revoked"
  : f.state === "expired" ? "Expired"
  : f.state === "deleted" ? "Deleted"
  : ACCESS[f.level];