import fs from "fs";
import path from "path";
import { ethers } from "ethers";

const root = process.cwd();
const dir = path.join(root, "src/contracts");
const say = (ok, msg) => console.log(`  ${ok ? "✓" : "✗"} ${msg}`);
let problems = 0;
const bad = (m) => { problems++; say(false, m); };

console.log("\nWhich contract file the website uses");
const libText = fs.readFileSync(path.join(root, "src/lib/contract.js"), "utf8");
const used = libText.match(/@\/contracts\/([\w.-]+\.json)/)?.[1];
if (!used) { bad("src/lib/contract.js does not import a contract file"); process.exit(1); }
say(true, `the website reads src/contracts/${used}`);

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
files.filter((f) => f !== used).forEach((f) => bad(`old copy src/contracts/${f} is not used. Delete it.`));
if (!files.includes(used)) { bad(`src/contracts/${used} is missing. Run the deploy script.`); process.exit(1); }

const deployPath = path.join(root, "..", "blockchain", "scripts", "deploy.js");
if (fs.existsSync(deployPath)) {
  const out = fs.readFileSync(deployPath, "utf8").match(/OUT\s*=\s*"([^"]+)"/)?.[1];
  if (out && out !== used) bad(`deploy.js writes ${out}, but the website reads ${used}. Make them the same.`);
  else say(true, "deploy.js writes the same file the website reads");
}

const j = JSON.parse(fs.readFileSync(path.join(dir, used), "utf8"));
const rpc = process.env.RPC_URL || (j.chainId === 31337 ? "http://127.0.0.1:8545" : "");
if (!rpc) { console.log("\nSet RPC_URL to your network address, then run again.\n"); process.exit(1); }

console.log(`\nLive contract ${j.address} (chain ${j.chainId})`);
try {
  const provider = new ethers.JsonRpcProvider(rpc);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== j.chainId) bad(`the node is on chain ${net.chainId} but the app expects ${j.chainId}`);

  const code = (await provider.getCode(j.address)).toLowerCase();
  if (code === "0x") { bad("no contract at this address. Deploy again."); process.exit(1); }
  say(true, `contract found (${(code.length - 2) / 2} bytes)`);

  const iface = new ethers.Interface(j.abi);
  const missing = iface.fragments.filter((f) => f.type === "function").filter((f) => !code.includes(f.selector.slice(2).toLowerCase()));
  missing.forEach((f) => bad(`the app calls ${f.name}(), but the deployed contract does not have it`));
  if (!missing.length) say(true, "every function the app uses exists on the deployed contract");
} catch (e) {
  bad(`could not reach the node: ${e.message}`);
}

console.log(problems ? "\nOut of sync. Do step 3, then run this again.\n" : "\nApp and contract match.\n");
process.exit(problems ? 1 : 0);