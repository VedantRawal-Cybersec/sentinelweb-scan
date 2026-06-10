// Server-only scanner. All checks run in parallel inside a server function.
// Uses fetch + Cloudflare DNS-over-HTTPS + AbuseIPDB — all Worker-compatible.

import type { Finding } from "./scoring";

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "SentinelAI-Scanner/1.0 (+https://sentinel.ai)",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(id);
  }
}

// ---------- HEADERS ----------
const CRITICAL_HEADERS: Array<{ key: string; title: string; penalty: number; rec: string }> = [
  { key: "strict-transport-security", title: "HSTS", penalty: 15, rec: "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains" },
  { key: "content-security-policy", title: "Content-Security-Policy", penalty: 12, rec: "Define a strict CSP. Start with default-src 'self'." },
  { key: "x-content-type-options", title: "X-Content-Type-Options", penalty: 5, rec: "Add: X-Content-Type-Options: nosniff" },
  { key: "x-frame-options", title: "X-Frame-Options", penalty: 7, rec: "Add: X-Frame-Options: DENY (or use CSP frame-ancestors)" },
  { key: "referrer-policy", title: "Referrer-Policy", penalty: 5, rec: "Add: Referrer-Policy: strict-origin-when-cross-origin" },
  { key: "permissions-policy", title: "Permissions-Policy", penalty: 4, rec: "Add a Permissions-Policy restricting unused features." },
  { key: "cross-origin-opener-policy", title: "Cross-Origin-Opener-Policy", penalty: 3, rec: "Add: Cross-Origin-Opener-Policy: same-origin" },
  { key: "cross-origin-resource-policy", title: "Cross-Origin-Resource-Policy", penalty: 2, rec: "Add: Cross-Origin-Resource-Policy: same-origin" },
];

const EXPOSURE_HEADERS = ["server", "x-powered-by", "x-aspnet-version", "x-generator"];

async function checkHeadersAndTls(url: string): Promise<{ findings: Finding[]; html?: string; finalUrl?: string }> {
  const findings: Finding[] = [];
  let res: Response;
  try {
    res = await fetchWithTimeout(url, { method: "GET", redirect: "follow" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    findings.push({
      id: "https-fail",
      category: "tls",
      title: "HTTPS connection failed",
      severity: "critical",
      detail: `Could not establish a verified HTTPS connection: ${msg}`,
      penalty: 40,
      recommendation: "Install a trusted TLS certificate and ensure HTTPS responds.",
    });
    return { findings };
  }

  if (url.startsWith("https://")) {
    findings.push({
      id: "tls-ok",
      category: "tls",
      title: "TLS certificate verified",
      severity: "pass",
      detail: "HTTPS connection completed with a valid, trusted certificate chain.",
      penalty: 0,
    });
  } else {
    findings.push({
      id: "no-https",
      category: "tls",
      title: "Site does not enforce HTTPS",
      severity: "critical",
      detail: "Connection was made over HTTP. Sensitive data can be intercepted.",
      penalty: 30,
      recommendation: "Redirect all HTTP traffic to HTTPS and add HSTS.",
    });
  }

  const h = res.headers;
  for (const ch of CRITICAL_HEADERS) {
    const val = h.get(ch.key);
    if (!val) {
      findings.push({
        id: `hdr-missing-${ch.key}`,
        category: "headers",
        title: `Missing ${ch.title}`,
        severity: ch.penalty >= 10 ? "high" : "medium",
        detail: `Response did not include the ${ch.title} header.`,
        penalty: ch.penalty,
        recommendation: ch.rec,
      });
    } else if (ch.key === "strict-transport-security" && !/max-age=\s*\d{7,}/.test(val)) {
      findings.push({
        id: "hsts-weak", category: "headers", title: "HSTS max-age too short",
        severity: "medium", detail: `HSTS present but max-age is short: ${val}`,
        penalty: 5, recommendation: "Use max-age >= 31536000 (1 year).",
      });
    } else if (ch.key === "content-security-policy" && /unsafe-inline|unsafe-eval/.test(val)) {
      findings.push({
        id: "csp-weak", category: "headers", title: "CSP allows unsafe-inline or unsafe-eval",
        severity: "medium", detail: "Your CSP weakens XSS protections.",
        penalty: 6, recommendation: "Remove 'unsafe-inline' and 'unsafe-eval' from your CSP.",
      });
    } else {
      findings.push({
        id: `hdr-ok-${ch.key}`, category: "headers", title: `${ch.title} present`,
        severity: "pass", detail: val.length > 200 ? val.slice(0, 200) + "…" : val, penalty: 0,
      });
    }
  }

  // CORS misconfig
  const acao = h.get("access-control-allow-origin");
  const acac = h.get("access-control-allow-credentials");
  if (acao === "*" && acac?.toLowerCase() === "true") {
    findings.push({
      id: "cors-wildcard-credentials", category: "headers",
      title: "Dangerous CORS: wildcard origin with credentials",
      severity: "high",
      detail: `Access-Control-Allow-Origin: * with Allow-Credentials: true is unsafe.`,
      penalty: 12,
      recommendation: "Set ACAO to a specific origin when credentials are allowed.",
    });
  } else if (acao === "*") {
    findings.push({
      id: "cors-wildcard", category: "headers", title: "CORS wildcard origin",
      severity: "low", detail: "Access-Control-Allow-Origin: *", penalty: 2,
      recommendation: "If this endpoint serves user data, restrict origins.",
    });
  }

  for (const k of EXPOSURE_HEADERS) {
    const v = h.get(k);
    if (v && /\d/.test(v)) {
      findings.push({
        id: `exposure-${k}`, category: "exposure",
        title: `Server tech leaked via ${k}`, severity: "low",
        detail: `${k}: ${v}`, penalty: 4,
        recommendation: `Strip or anonymise the ${k} header.`,
      });
    }
  }

  // Cookies
  const setCookies = (h as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const c of setCookies) {
    const name = c.split("=")[0];
    const lower = c.toLowerCase();
    const missing: string[] = [];
    if (!lower.includes("secure")) missing.push("Secure");
    if (!lower.includes("httponly")) missing.push("HttpOnly");
    if (!/samesite=/i.test(c)) missing.push("SameSite");
    if (missing.length) {
      findings.push({
        id: `cookie-${name}`, category: "cookies",
        title: `Cookie '${name}' missing flags: ${missing.join(", ")}`,
        severity: missing.includes("Secure") ? "high" : "medium",
        detail: c.slice(0, 200),
        penalty: Math.min(15, missing.length * 5),
        recommendation: `Add the ${missing.join(", ")} attribute(s) to this cookie.`,
      });
    }
  }

  // Capture small HTML snippet for mixed-content scan
  let html: string | undefined;
  const ct = h.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    try {
      const text = await res.text();
      html = text.slice(0, 200_000);
    } catch { /* ignore */ }
  }

  return { findings, html, finalUrl: res.url };
}

// ---------- MIXED CONTENT ----------
function checkMixedContent(html: string | undefined, isHttps: boolean): Finding[] {
  if (!html || !isHttps) return [];
  const matches = html.match(/(?:src|href)\s*=\s*["']http:\/\/[^"']+/gi) ?? [];
  const filtered = matches.filter((m) => !/http:\/\/(www\.)?w3\.org/i.test(m));
  if (!filtered.length) {
    return [{ id: "mixed-ok", category: "exposure", title: "No mixed content detected", severity: "pass", detail: "All resource refs use HTTPS.", penalty: 0 }];
  }
  return [{
    id: "mixed-content", category: "exposure",
    title: `Mixed content: ${filtered.length} insecure resource(s)`,
    severity: "high",
    detail: filtered.slice(0, 3).map((s) => s.replace(/^["']?(src|href)\s*=\s*["']/i, "").slice(0, 120)).join("\n"),
    penalty: 10,
    recommendation: "Load all scripts, images, and iframes over HTTPS.",
  }];
}

// ---------- SENSITIVE FILE EXPOSURE ----------
const SENSITIVE_PATHS = [
  { p: "/.env", t: "Environment file (.env)", pen: 30, sev: "critical" as const },
  { p: "/.git/config", t: ".git repository exposed", pen: 25, sev: "critical" as const },
  { p: "/.DS_Store", t: ".DS_Store exposed", pen: 4, sev: "low" as const },
  { p: "/wp-config.php.bak", t: "WordPress config backup", pen: 25, sev: "critical" as const },
  { p: "/phpinfo.php", t: "phpinfo() exposed", pen: 15, sev: "high" as const },
  { p: "/backup.zip", t: "backup.zip exposed", pen: 18, sev: "high" as const },
  { p: "/.well-known/security.txt", t: "security.txt missing", pen: 1, sev: "info" as const, expectMissing: true },
];

async function checkSensitiveFiles(origin: string): Promise<Finding[]> {
  const out: Finding[] = [];
  await Promise.all(
    SENSITIVE_PATHS.map(async (s) => {
      try {
        const r = await fetchWithTimeout(`${origin}${s.p}`, { method: "GET" }, 6000);
        const found = r.status === 200;
        if (s.expectMissing) {
          if (!found) {
            out.push({ id: `sec-txt`, category: "exposure", title: "security.txt missing", severity: "low", detail: "RFC 9116 security.txt not published.", penalty: 1, recommendation: "Publish /.well-known/security.txt with contact info." });
          } else {
            out.push({ id: `sec-txt-ok`, category: "exposure", title: "security.txt present", severity: "pass", detail: "RFC 9116 contact published.", penalty: 0 });
          }
        } else if (found) {
          // Verify body looks like the real thing (avoid SPA 200 fallback)
          const body = (await r.text()).slice(0, 500);
          const looksReal =
            (s.p === "/.env" && /[A-Z_]+\s*=/.test(body)) ||
            (s.p === "/.git/config" && /\[core\]/.test(body)) ||
            (s.p === "/phpinfo.php" && /PHP Version/i.test(body)) ||
            (s.p.endsWith(".zip") && r.headers.get("content-type")?.includes("zip")) ||
            (s.p === "/.DS_Store" && body.includes("Bud1")) ||
            (s.p.endsWith(".bak") && /DB_|password/i.test(body));
          if (looksReal) {
            out.push({
              id: `exposed-${s.p}`, category: "exposure", title: s.t,
              severity: s.sev, detail: `${origin}${s.p} returns 200 with sensitive content.`,
              penalty: s.pen,
              recommendation: `Block access to ${s.p} at the web server / WAF.`,
            });
          }
        }
      } catch { /* ignore */ }
    }),
  );
  return out;
}

// ---------- OPEN REDIRECT HEURISTIC ----------
async function checkOpenRedirect(origin: string): Promise<Finding[]> {
  const target = "https://example.org/sentinel-canary";
  const probes = [`/?next=${encodeURIComponent(target)}`, `/?url=${encodeURIComponent(target)}`, `/?redirect=${encodeURIComponent(target)}`];
  for (const p of probes) {
    try {
      const r = await fetchWithTimeout(`${origin}${p}`, { method: "GET" }, 5000);
      const loc = r.headers.get("location") ?? "";
      if (r.status >= 300 && r.status < 400 && /example\.org\/sentinel-canary/.test(loc)) {
        return [{
          id: "open-redirect", category: "exposure",
          title: "Possible open redirect", severity: "high",
          detail: `${p} → ${loc}`, penalty: 10,
          recommendation: "Validate redirect targets against an allow-list.",
        }];
      }
    } catch { /* ignore */ }
  }
  return [];
}

// ---------- DNS ----------
async function dohQuery(name: string, type: string): Promise<string[]> {
  const res = await fetchWithTimeout(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { Accept: "application/dns-json" } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { Answer?: Array<{ data: string }> };
  return (data.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, ""));
}

async function checkDns(hostname: string): Promise<{ findings: Finding[]; ips: string[] }> {
  const findings: Finding[] = [];
  const [a, txt, mx, caa] = await Promise.all([
    dohQuery(hostname, "A").catch(() => []),
    dohQuery(hostname, "TXT").catch(() => []),
    dohQuery(hostname, "MX").catch(() => []),
    dohQuery(hostname, "CAA").catch(() => []),
  ]);

  const ips = a.filter((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x));

  if (ips.length === 0) {
    findings.push({ id: "dns-no-a", category: "dns", title: "No A records found", severity: "medium", detail: `Could not resolve A records for ${hostname}.`, penalty: 5 });
  } else {
    findings.push({ id: "dns-a-ok", category: "dns", title: "DNS resolves", severity: "pass", detail: `${ips.length} A record(s): ${ips.slice(0, 3).join(", ")}`, penalty: 0 });
  }

  if (caa.length === 0) {
    findings.push({ id: "no-caa", category: "dns", title: "No CAA record", severity: "low", detail: "No CAA record restricts which CAs can issue certs.", penalty: 2, recommendation: "Publish a CAA record listing trusted CAs only." });
  } else {
    findings.push({ id: "caa-ok", category: "dns", title: "CAA record set", severity: "pass", detail: caa.slice(0, 2).join("; "), penalty: 0 });
  }

  if (mx.length > 0) {
    const spf = txt.find((t) => /^v=spf1/i.test(t));
    if (!spf) {
      findings.push({ id: "no-spf", category: "dns", title: "No SPF record", severity: "medium", detail: "No v=spf1 record found.", penalty: 8, recommendation: "Publish an SPF TXT record." });
    } else {
      findings.push({ id: "spf-ok", category: "dns", title: "SPF record found", severity: "pass", detail: spf.slice(0, 150), penalty: 0 });
    }

    const dmarcTxt = await dohQuery(`_dmarc.${hostname}`, "TXT").catch(() => []);
    const dmarc = dmarcTxt.find((t) => /^v=DMARC1/i.test(t));
    if (!dmarc) {
      findings.push({ id: "no-dmarc", category: "dns", title: "No DMARC record", severity: "medium", detail: "No DMARC policy at _dmarc subdomain.", penalty: 8, recommendation: "Publish a DMARC record." });
    } else {
      const policy = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1] ?? "none";
      findings.push({
        id: "dmarc-found", category: "dns",
        title: `DMARC policy: ${policy}`,
        severity: policy === "none" ? "low" : "pass",
        detail: dmarc.slice(0, 150),
        penalty: policy === "none" ? 3 : 0,
        recommendation: policy === "none" ? "Move DMARC policy to quarantine or reject." : undefined,
      });
    }
  }

  return { findings, ips };
}

// ---------- IP REPUTATION ----------
async function checkIpReputation(ip: string): Promise<Finding[]> {
  const key = process.env.ABUSEIPDB_API_KEY;
  if (!key) {
    return [{ id: "abuse-no-key", category: "reputation", title: "IP reputation check skipped", severity: "info", detail: "ABUSEIPDB_API_KEY is not configured.", penalty: 0 }];
  }
  try {
    const res = await fetchWithTimeout(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`,
      { headers: { Key: key, Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`AbuseIPDB ${res.status}`);
    const json = (await res.json()) as { data: { abuseConfidenceScore: number; totalReports: number; usageType?: string; isp?: string; countryCode?: string } };
    const d = json.data;
    const score = d.abuseConfidenceScore;
    let severity: Finding["severity"] = "pass";
    let penalty = 0;
    if (score > 75) { severity = "critical"; penalty = 25; }
    else if (score > 40) { severity = "high"; penalty = 12; }
    else if (score > 10) { severity = "medium"; penalty = 5; }
    return [{
      id: "abuseipdb", category: "reputation",
      title: `IP abuse confidence: ${score}%`,
      severity,
      detail: `${d.totalReports} report(s) · ${d.usageType ?? "unknown"} · ${d.isp ?? ""} · ${d.countryCode ?? ""}`.trim(),
      penalty,
      recommendation: score > 10 ? "Investigate why this IP is being reported as abusive." : undefined,
    }];
  } catch (e) {
    return [{ id: "abuse-fail", category: "reputation", title: "IP reputation check failed", severity: "info", detail: e instanceof Error ? e.message : String(e), penalty: 0 }];
  }
}

// ---------- ROBOTS.TXT ----------
async function checkRobots(origin: string): Promise<Finding[]> {
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, { method: "GET" });
    if (!res.ok) return [{ id: "no-robots", category: "exposure", title: "robots.txt not found", severity: "info", detail: `GET /robots.txt returned ${res.status}`, penalty: 0 }];
    const text = (await res.text()).slice(0, 4000);
    const sensitive = /admin|wp-admin|backup|\.env|\.git|secret|api[-_]?key/i.test(text);
    return [{
      id: "robots",
      category: "exposure",
      title: sensitive ? "robots.txt exposes sensitive paths" : "robots.txt present",
      severity: sensitive ? "medium" : "pass",
      detail: text.split("\n").slice(0, 5).join("\n"),
      penalty: sensitive ? 6 : 0,
      recommendation: sensitive ? "Don't list sensitive paths in robots.txt — it advertises them." : undefined,
    }];
  } catch { return []; }
}

// ---------- ORCHESTRATOR ----------
export async function runScan(url: string, hostname: string): Promise<Finding[]> {
  const origin = new URL(url).origin;
  const isHttps = url.startsWith("https://");

  const [hdr, dnsResult, robots, sensitive, openRedir] = await Promise.all([
    checkHeadersAndTls(url).catch((e) => ({ findings: [{ id: "headers-fail", category: "headers" as const, title: "Headers/TLS check failed", severity: "info" as const, detail: e instanceof Error ? e.message : String(e), penalty: 0 }], html: undefined })),
    checkDns(hostname).catch(() => ({ findings: [], ips: [] as string[] })),
    checkRobots(origin).catch(() => []),
    checkSensitiveFiles(origin).catch(() => []),
    checkOpenRedirect(origin).catch(() => []),
  ]);

  const mixed = checkMixedContent(hdr.html, isHttps);
  const ipFindings = dnsResult.ips[0] ? await checkIpReputation(dnsResult.ips[0]) : [];

  return [...hdr.findings, ...dnsResult.findings, ...robots, ...sensitive, ...openRedir, ...mixed, ...ipFindings];
}
