import { readFile } from "fs/promises";
import path from "path";

const FALLBACKS = ["https://ipfs.io/ipfs", "https://dweb.link/ipfs"];

async function fetchWithTimeout(url, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(timer); }
}

export async function GET(_req, { params }) {
  const { cid } = await params;
  if (!/^[a-zA-Z0-9-]+$/.test(cid)) return new Response("Bad CID", { status: 400 });

  if (cid.startsWith("local-")) {
    if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
    try {
      return new Response(await readFile(path.join(process.cwd(), ".storage", cid)));
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  const gateways = [process.env.IPFS_GATEWAY, ...FALLBACKS].filter(Boolean).map((g) => g.replace(/\/$/, ""));
  for (const g of gateways) {
    try {
      const r = await fetchWithTimeout(`${g}/${cid}`);
      if (r.ok && r.body) {
        return new Response(r.body, {
          headers: { "Content-Type": "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
        });
      }
    } catch {}
  }
  return new Response("Storage unavailable", { status: 502 });
}