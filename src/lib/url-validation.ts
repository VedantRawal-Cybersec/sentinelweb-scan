// Shared URL validation (safe in both client and server bundles).

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fe80:/i,
];

const BLOCKED_HOSTS = new Set(["localhost", "ip6-localhost", "localhost.localdomain"]);

export type ValidatedUrl = { ok: true; url: string; hostname: string } | { ok: false; error: string };

export function validateScanUrl(input: string): ValidatedUrl {
  if (!input || typeof input !== "string") return { ok: false, error: "URL is required" };
  let raw = input.trim();
  if (raw.length > 2048) return { ok: false, error: "URL is too long" };
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only http and https URLs are supported" };
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return { ok: false, error: "Local hostnames are not allowed" };
  for (const r of PRIVATE_RANGES) {
    if (r.test(host)) return { ok: false, error: "Private / loopback addresses are not allowed" };
  }
  if (!host.includes(".") && !host.includes(":")) {
    return { ok: false, error: "Hostname must be a public domain" };
  }
  return { ok: true, url: parsed.toString(), hostname: host };
}
