import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_BYTES = 4 * 1024 * 1024 + 1024; // the host rejects bigger requests anyway

function sameOrigin(req) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function POST(req) {
  try {
    // Online, only this website may upload (stops strangers filling your storage)
    if (process.env.NODE_ENV === "production" && !sameOrigin(req)) {
      return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "No file received" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "This file is too large. Files up to 4 MB can be uploaded." }, { status: 413 });

    // Real IPFS through Pinata
    if (process.env.PINATA_JWT) {
      const body = new FormData();
      body.append("file", file);
      body.append("network", "public");
      const r = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
        body,
      });
      const j = await r.json().catch(() => ({}));
      const cid = j?.data?.cid;
      if (!r.ok || !cid) {
        console.error("Pinata upload failed", r.status, JSON.stringify(j).slice(0, 300));
        return NextResponse.json({ error: "The storage service rejected the upload." }, { status: 502 });
      }
      return NextResponse.json({ cid });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "File storage is not configured." }, { status: 500 });
    }

    // Local development only: store in web/.storage
    const buf = Buffer.from(await file.arrayBuffer());
    const cid = "local-" + crypto.createHash("sha256").update(buf).digest("hex");
    const dir = path.join(process.cwd(), ".storage");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, cid), buf);
    return NextResponse.json({ cid });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}