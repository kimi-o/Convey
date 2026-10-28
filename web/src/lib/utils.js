export const short = (a = "") => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const pad = (n) => String(n).padStart(2, "0");

/** 18/10/2026 2:30pm */
export function fmtStamp(ts) {
  const d = new Date(Number(ts) * 1000);
  const h = d.getHours();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${h % 12 || 12}:${pad(d.getMinutes())}${h >= 12 ? "pm" : "am"}`;
}
export const fmtDate = fmtStamp;

export function fmtSize(bytes) {
  const n = Number(bytes);
  if (!n) return "0 KB";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const sameAddr = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export const expiryFromDays = (days) => (Number(days) ? Math.floor(Date.now() / 1000) + Number(days) * 86400 : 0);
export const isExpired = (expiry) => Number(expiry) !== 0 && Number(expiry) * 1000 < Date.now();
export const fmtExpiry = (expiry) => (Number(expiry) ? fmtStamp(expiry) : "Never");