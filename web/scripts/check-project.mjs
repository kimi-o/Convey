import fs from "fs";
import path from "path";

const SRC = path.join(process.cwd(), "src");
const exists = (p) => fs.existsSync(path.join(SRC, p));

const need = [
  "app/layout.js", "app/globals.css", "app/page.js", "app/login/page.js", "app/(app)/layout.js", "app/(app)/error.js",
  "app/(app)/dashboard/page.js", "app/(app)/files/page.js", "app/(app)/files/[id]/page.js", "app/(app)/shared/page.js",
  "app/(app)/permissions/page.js", "app/(app)/verification/page.js", "app/(app)/upload/page.js", "app/(app)/inbox/page.js",
  "app/(app)/audit/page.js", "app/(app)/users/add/page.js", "app/(app)/users/manage/page.js",
  "app/api/ipfs/route.js", "app/api/ipfs/[cid]/route.js",
  "components/Badge.js", "components/Steps.js", "components/Sidebar.js", "components/Topbar.js", "components/ActivityTable.js",
  "components/FileList.js", "components/ShareModal.js", "components/RequestModal.js", "components/DeleteModal.js",
  "components/ui/ArrowLink.js", "components/ui/Button.js", "components/ui/EmptyState.js", "components/ui/MetaGrid.js",
  "components/ui/Modal.js", "components/ui/PageTitle.js", "components/ui/SectionTitle.js", "components/ui/Skeleton.js",
  "components/ui/StatCard.js", "components/ui/Tabs.js", "components/ui/styles.js",
  "components/landing/Hero.js", "components/landing/Navbar.js",
  "context/WalletContext.js", "context/VaultContext.js",
  "lib/contract.js", "lib/crypto.js", "lib/events.js", "lib/inbox.js", "lib/ipfs.js", "lib/notify.js", "lib/tx.js", "lib/utils.js", "lib/wallet.js",
  "contracts/blockapp.json",
];
const gone = [
  "app/(app)/upload/UploadModal.js", "app/(app)/requests", "app/(app)/send", "app/(app)/verify", "app/(app)/admin",
  "components/FileTable.js", "components/FileTimeline.js", "components/UploadModal.js",
];
const banned = [
  [/retired/i, "old Auditor code"], [/getAllFiles/, "old contract call"], [/getGrant\(/, "old call (use getMyGrant)"],
  [/getRequests\(/, "old call (use getMyRequests)"], [/loadFiles/, "old data loader"], [/role (===|!==) 4/, "old Admin role number"],
  [/recordAccess\(\s*fileId\s*\)/, "old recordAccess (needs 2 arguments)"], [/\.shareFile\(/, "old share call (use shareWithMany)"],
  [/verifyHash/, "old verify call"],
];

let problems = 0;
const bad = (m) => { problems++; console.log("  ✗ " + m); };

console.log("\nRequired files");
need.forEach((p) => { if (!exists(p)) bad("missing: src/" + p); });
console.log("\nOld files that must be deleted");
gone.forEach((p) => { if (exists(p)) bad("delete: src/" + p); });

console.log("\nStale code");
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (f.name.endsWith(".js")) {
      const text = fs.readFileSync(full, "utf8");
      banned.forEach(([re, why]) => { if (re.test(text)) bad(`${path.relative(SRC, full)}: ${why}`); });
    }
  }
})(SRC);

console.log("\nDeployed contract (blockapp.json)");
try {
  const j = JSON.parse(fs.readFileSync(path.join(SRC, "contracts/blockapp.json"), "utf8"));
  const fn = (n) => j.abi.find((x) => x.type === "function" && x.name === n);
  ["getMyFiles", "getMyRequests", "shareWithMany", "updateDepartment", "uploadFile", "verifyFile"].forEach((n) => { if (!fn(n)) bad(`ABI lacks ${n}: deploy the new contract`); });
  if (fn("recordAccess")?.inputs.length !== 2) bad("ABI has the old recordAccess: deploy the new contract");
  if (fn("resolveRequest")?.inputs.length !== 4) bad("ABI has the old resolveRequest: deploy the new contract");
  console.log(`  chain ${j.chainId}, address ${j.address}`);
} catch { bad("blockapp.json missing or unreadable: run the deploy script"); }

console.log(problems ? `\n${problems} problem(s) found. Fix them and run again.\n` : "\nAll checks passed.\n");
process.exit(problems ? 1 : 0);