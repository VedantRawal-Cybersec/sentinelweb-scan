// Builds proof metadata for a Finding based on its id/category/severity.
// Pure function — no I/O. Honest, evidence-based, no exaggeration.

import {
  type Finding,
  type Proof,
  type ProofLevel,
  PROOF_LABEL,
  proofLevelFromScore,
} from "./scoring";

interface Ctx {
  url: string;
  hostname: string;
  finalUrl?: string;
}

interface Recipe {
  module: string;
  detectionMethod: string;
  context?: string;
  parameter?: string;
  evidence: (f: Finding, c: Ctx) => string[];
  confirmed: (f: Finding, c: Ctx) => string[];
  notConfirmed?: string[];
  missing?: string[];
  base: number; // proof score for severity != pass
  reproduced?: boolean;
  toolsAgreed?: number;
  // Optional override: returns a level regardless of computed score
  forceLevel?: (f: Finding) => ProofLevel | undefined;
}

const URL_LIVE = "Target URL responded with HTTP status";
const HEADERS_PARSED = "Response headers were parsed deterministically";
const DOH_QUERY = "Cloudflare DoH JSON resolver";

const RECIPES: Record<string, Recipe> = {
  // ---- TLS ----
  "tls-ok": {
    module: "TLS Probe",
    detectionMethod: "HTTPS request completed against trusted CA chain",
    evidence: (_f, c) => [`HTTPS handshake to ${c.hostname} completed`, "TLS certificate chain validated by runtime"],
    confirmed: () => ["Trusted certificate present", "HTTPS reachable"],
    base: 95,
    reproduced: true,
    toolsAgreed: 1,
    forceLevel: () => "not-vulnerable",
  },
  "no-https": {
    module: "TLS Probe",
    detectionMethod: "Plain HTTP request succeeded; no redirect to HTTPS observed",
    evidence: (_f, c) => [`Request to ${c.url} used http://`, "No 301/302 upgrade to HTTPS observed"],
    confirmed: () => ["Site accepts plain HTTP", "Traffic can be intercepted on the wire"],
    notConfirmed: ["Active MitM in the wild"],
    missing: ["HSTS preload listing"],
    base: 92,
    reproduced: true,
    toolsAgreed: 1,
  },
  "https-fail": {
    module: "TLS Probe",
    detectionMethod: "TCP/TLS connection error during fetch",
    evidence: (f) => [`Fetch error: ${f.detail.slice(0, 200)}`],
    confirmed: () => ["HTTPS endpoint did not complete a verified handshake"],
    notConfirmed: ["Whether HTTP fallback exists"],
    missing: ["Certificate chain details"],
    base: 80,
    toolsAgreed: 1,
  },
  // ---- CORS ----
  "cors-wildcard-credentials": {
    module: "Header Inspector",
    detectionMethod: "Response advertised wildcard ACAO together with credentials",
    context: "CORS",
    evidence: (_f) => ["Access-Control-Allow-Origin: *", "Access-Control-Allow-Credentials: true"],
    confirmed: () => ["Server returns dangerous CORS combination on the tested path"],
    notConfirmed: ["That a sensitive endpoint actually exposes user data"],
    missing: ["Cross-origin read PoC against an authenticated endpoint"],
    base: 78,
    reproduced: true,
    toolsAgreed: 1,
  },
  "cors-wildcard": {
    module: "Header Inspector",
    detectionMethod: "Wildcard origin observed without credentials",
    evidence: () => ["Access-Control-Allow-Origin: *"],
    confirmed: () => ["Wildcard origin present on tested path"],
    notConfirmed: ["Whether the endpoint serves sensitive data"],
    missing: ["Mapping of which routes share this policy"],
    base: 55,
  },
  // ---- Mixed content ----
  "mixed-content": {
    module: "HTML Parser",
    detectionMethod: "Regex match of http:// in src/href attributes on first 200 KB of HTML",
    context: "HTML attribute",
    evidence: (f) => f.detail.split("\n").map((s) => `Insecure resource ref: ${s.slice(0, 120)}`),
    confirmed: () => ["At least one resource loaded over plain HTTP on an HTTPS page"],
    notConfirmed: ["Active downgrade attack"],
    missing: ["Browser-side verification across all pages"],
    base: 80,
    reproduced: true,
    toolsAgreed: 1,
  },
  // ---- Open redirect ----
  "open-redirect": {
    module: "Redirect Probe",
    detectionMethod: "Safe canary URL submitted in next/url/redirect query params; Location header inspected",
    parameter: "next | url | redirect",
    evidence: (f) => [f.detail],
    confirmed: () => ["Application echoed the canary URL into Location header", "3xx redirect issued to attacker-controlled host"],
    notConfirmed: ["Whether protections exist on other endpoints"],
    missing: ["Allow-list enforcement check on POST handlers"],
    base: 82,
    reproduced: true,
    toolsAgreed: 1,
  },
  // ---- IP reputation ----
  abuseipdb: {
    module: "AbuseIPDB",
    detectionMethod: "Third-party reputation lookup over resolved A record",
    evidence: (f) => [f.detail],
    confirmed: () => ["External reputation data returned for resolved IP"],
    notConfirmed: ["Whether the site itself is malicious"],
    missing: ["Cross-check with VirusTotal / AlienVault"],
    base: 70,
    toolsAgreed: 1,
  },
};

const HEADER_MISSING_RX = /^hdr-missing-/;
const HEADER_OK_RX = /^hdr-ok-/;
const EXPOSED_FILE_RX = /^exposed-/;
const COOKIE_RX = /^cookie-/;
const EXPOSURE_HDR_RX = /^exposure-/;

export function buildProof(f: Finding, ctx: Ctx): Proof {
  const now = new Date().toISOString();
  const recipe = RECIPES[f.id];

  let level: ProofLevel;
  let score: number;
  let module = "Sentinel Scanner";
  let detectionMethod = "Automated check";
  let context: string | undefined;
  let parameter: string | undefined;
  let evidence: string[] = [];
  let confirmed: string[] = [];
  let notConfirmed: string[] = [];
  let missing: string[] = [];
  let reproduced = false;
  let toolsAgreed = 1;

  if (recipe) {
    module = recipe.module;
    detectionMethod = recipe.detectionMethod;
    context = recipe.context;
    parameter = recipe.parameter;
    evidence = recipe.evidence(f, ctx);
    confirmed = recipe.confirmed(f, ctx);
    notConfirmed = recipe.notConfirmed ?? [];
    missing = recipe.missing ?? [];
    reproduced = recipe.reproduced ?? false;
    toolsAgreed = recipe.toolsAgreed ?? 1;
    score = f.severity === "pass" ? 100 : recipe.base;
    level = recipe.forceLevel?.(f) ?? proofLevelFromScore(score);
  } else if (HEADER_MISSING_RX.test(f.id)) {
    module = "Header Inspector";
    detectionMethod = "Enumerated response headers via deterministic GET; absence verified by Headers.get() returning null";
    context = "HTTP response headers";
    evidence = [HEADERS_PARSED, `Header '${f.id.replace(HEADER_MISSING_RX, "")}' not present in response`];
    confirmed = ["Security header is absent on the tested response"];
    notConfirmed = ["That the header is absent on every route (only the tested URL was checked)"];
    missing = ["Multi-route verification"];
    reproduced = true;
    score = 88;
    level = "high-confidence";
  } else if (HEADER_OK_RX.test(f.id)) {
    module = "Header Inspector";
    detectionMethod = HEADERS_PARSED;
    evidence = [`Header value observed: ${f.detail.slice(0, 200)}`];
    confirmed = ["Header present with a non-empty value"];
    score = 100;
    level = "not-vulnerable";
    reproduced = true;
  } else if (EXPOSED_FILE_RX.test(f.id)) {
    module = "Sensitive File Probe";
    detectionMethod = "Direct GET to known sensitive path with content-shape validation (avoids SPA 200 fallback)";
    evidence = [URL_LIVE + " 200", "Response body matched the expected fingerprint for this file type"];
    confirmed = ["Sensitive file is publicly reachable and returns matching content"];
    notConfirmed = ["What credentials/data the file ultimately exposes"];
    missing = ["Full content review"];
    reproduced = true;
    score = 95;
    level = "verified";
  } else if (COOKIE_RX.test(f.id)) {
    module = "Cookie Inspector";
    detectionMethod = "Parsed Set-Cookie headers and checked for Secure/HttpOnly/SameSite flags";
    context = "Set-Cookie";
    evidence = [`Cookie observed: ${f.detail.slice(0, 160)}`];
    confirmed = ["Cookie is missing one or more protection flags"];
    notConfirmed = ["Whether the cookie carries an auth/session token"];
    missing = ["Server-side session classification"];
    reproduced = true;
    score = 80;
    level = "high-confidence";
  } else if (EXPOSURE_HDR_RX.test(f.id)) {
    module = "Header Inspector";
    detectionMethod = "Detected version-bearing identification header";
    evidence = [`Header leak: ${f.detail.slice(0, 160)}`];
    confirmed = ["Server discloses software/version info"];
    notConfirmed = ["That a known CVE applies to this exact build"];
    missing = ["CVE cross-reference"];
    score = 55;
    level = "potential";
    reproduced = true;
  } else if (f.category === "dns") {
    module = "DNS Resolver";
    detectionMethod = DOH_QUERY;
    evidence = [`DoH query for ${ctx.hostname} returned: ${f.detail.slice(0, 200)}`];
    confirmed = f.severity === "pass" ? ["Record observed in DNS response"] : ["Expected record was absent in DNS response"];
    notConfirmed = f.severity === "pass" ? [] : ["Whether other resolvers see a different answer"];
    missing = f.severity === "pass" ? [] : ["Cross-resolver verification (Google, Quad9)"];
    reproduced = true;
    score = f.severity === "pass" ? 100 : 78;
    level = f.severity === "pass" ? "not-vulnerable" : "high-confidence";
  } else if (f.id === "robots") {
    module = "Robots.txt Inspector";
    detectionMethod = "Fetched /robots.txt and scanned for sensitive path patterns";
    evidence = [f.detail];
    confirmed = f.severity === "medium" ? ["robots.txt lists paths that look sensitive"] : ["robots.txt is reachable"];
    notConfirmed = ["Whether those paths are actually unprotected"];
    missing = ["Auth check against each listed path"];
    score = f.severity === "medium" ? 60 : 100;
    level = f.severity === "medium" ? "potential" : "not-vulnerable";
    reproduced = true;
  } else if (f.severity === "pass") {
    score = 100;
    level = "not-vulnerable";
    evidence = [f.detail.slice(0, 160)];
    confirmed = ["Check passed under current scan"];
  } else if (f.severity === "info") {
    score = 0;
    level = "not-vulnerable";
    evidence = [f.detail.slice(0, 160)];
    confirmed = ["Informational only — no vulnerability claim"];
    notConfirmed = ["Anything that requires deeper coverage"];
    missing = ["Authenticated scan / authorized deep probe"];
  } else {
    score = 50;
    level = "potential";
    evidence = [f.detail.slice(0, 160)];
    confirmed = ["Scanner signal triggered"];
    notConfirmed = ["Exploitability"];
    missing = ["Manual verification"];
  }

  const manualReviewRequired = level === "potential" || level === "needs-review" || level === "high-confidence";

  const outcome =
    level === "verified"
      ? "Valid security finding — remediate."
      : level === "high-confidence"
      ? "Very likely real — confirm and remediate."
      : level === "potential"
      ? "Suspicious signal — manual verification required."
      : level === "needs-review"
      ? "Weak signal only — needs manual review."
      : level === "encoded-safe"
      ? "Reflected input is encoded — not exploitable under current test."
      : "No issue confirmed under current scan.";

  return {
    level,
    label: PROOF_LABEL[level],
    score,
    detectionMethod,
    module,
    testedUrl: ctx.finalUrl ?? ctx.url,
    parameter,
    context,
    evidence,
    confirmed,
    notConfirmed,
    missing,
    toolsAgreed,
    reproduced,
    manualReviewRequired,
    outcome,
    detectedAt: now,
  };
}

export function attachProofs(findings: Finding[], ctx: Ctx): Finding[] {
  return findings.map((f) => (f.proof ? f : { ...f, proof: buildProof(f, ctx) }));
}
