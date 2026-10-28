const MAX_BYTES = 4 * 1024 * 1024; // the online host rejects bigger requests

export async function uploadEncrypted(bytes, name) {
  if (bytes.length > MAX_BYTES) throw new Error("This file is too large. Files up to 4 MB can be uploaded.");
  const form = new FormData();
  form.append("file", new Blob([bytes]), `${name}.enc`);
  const res = await fetch("/api/ipfs", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json.cid;
}

export async function downloadEncrypted(cid) {
  const res = await fetch(`/api/ipfs/${cid}`);
  if (!res.ok) throw new Error("Could not fetch the encrypted file from storage");
  return new Uint8Array(await res.arrayBuffer());
}