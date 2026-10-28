import crypto from "crypto";

const jwt = process.env.PINATA_JWT;
const gateway = (process.env.IPFS_GATEWAY || "").replace(/\/$/, "");
const ok = (m) => console.log("  ✓ " + m);
const fail = (m) => { console.log("  ✗ " + m); process.exitCode = 1; };

if (!jwt) { fail("PINATA_JWT is missing in web/.env.local"); process.exit(1); }
if (!gateway) { fail("IPFS_GATEWAY is missing in web/.env.local (format: https://your-gateway.mypinata.cloud/ipfs)"); process.exit(1); }

const bytes = crypto.randomBytes(2048);

console.log("\n1. Uploading a 2 KB test file to Pinata");
const body = new FormData();
body.append("file", new Blob([bytes]), "convey-storage-test.enc");
body.append("network", "public");
const up = await fetch("https://uploads.pinata.cloud/v3/files", { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body });
const json = await up.json().catch(() => ({}));
if (up.status === 401 || up.status === 403) {
  fail(`Pinata refused the key (HTTP ${up.status}). Create a new API key that can write files and paste its JWT.`);
  process.exit(1);
}
const cid = json?.data?.cid;
if (!up.ok || !cid) { fail(`Upload failed (HTTP ${up.status}): ${JSON.stringify(json).slice(0, 200)}`); process.exit(1); }
ok(`uploaded, CID ${cid}`);

console.log("\n2. Downloading it through your gateway");
let same = false, last = 0;
for (let i = 1; i <= 6 && !same; i++) {
  try {
    const r = await fetch(`${gateway}/${cid}`);
    last = r.status;
    if (r.ok) same = Buffer.from(await r.arrayBuffer()).equals(bytes);
  } catch {}
  if (!same) await new Promise((r) => setTimeout(r, 2500));
}
if (same) ok("downloaded and identical to what was uploaded");
else fail(`could not download it (last HTTP ${last}). Check IPFS_GATEWAY: it must be your own gateway domain ending in /ipfs.`);

console.log(process.exitCode ? "\nStorage test FAILED.\n" : "\nStorage test PASSED. Files can be stored on Pinata.\n");