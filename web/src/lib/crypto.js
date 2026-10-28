import nacl from "tweetnacl";
import { ethers } from "ethers";

export const fromHex = (h) => ethers.getBytes(h);

/** SHA-256 of an ArrayBuffer → 0x-prefixed hex (fits bytes32 on-chain) */
export async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return ethers.hexlify(new Uint8Array(digest));
}

export const generateFileKey = () => crypto.getRandomValues(new Uint8Array(32));

const importAes = (raw) => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);

/** Output layout: [12-byte IV][ciphertext] */
export async function encryptBuffer(buffer, rawKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await importAes(rawKey), buffer));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return out;
}

export async function decryptBuffer(bytes, rawKey) {
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, await importAes(rawKey), ct);
}

/** Deterministic X25519 keypair from a wallet signature (no private key storage needed) */
export async function deriveKeypair(signer) {
  const address = await signer.getAddress();
  const sig = await signer.signMessage(
    `blockapp encryption key\nWallet: ${address}\nVersion: 1\n\nSigning this message is free and does not send a transaction.`
  );
  const seed = ethers.getBytes(ethers.sha256(sig));
  return nacl.box.keyPair.fromSecretKey(seed);
}

/** Wrap a file key for a recipient's public key. Layout: [ephPub 32][nonce 24][box] */
export function wrapKey(rawFileKey, recipientPubHex) {
  const eph = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const box = nacl.box(rawFileKey, nonce, fromHex(recipientPubHex), eph.secretKey);
  const out = new Uint8Array(32 + 24 + box.length);
  out.set(eph.publicKey, 0);
  out.set(nonce, 32);
  out.set(box, 56);
  return ethers.hexlify(out);
}

export function unwrapKey(wrappedHex, secretKey) {
  const b = fromHex(wrappedHex);
  if (b.length < 57) throw new Error("No key found. You may not have access to this file.");
  const key = nacl.box.open(b.slice(56), b.slice(32, 56), b.slice(0, 32), secretKey);
  if (!key) throw new Error("Cannot unwrap the file key (wrong wallet or tampered data).");
  return key;
}