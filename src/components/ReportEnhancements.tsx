import { useEffect, useMemo, useState } from "react";
import type { ScanResult } from "@/lib/scanner.functions";
import type { Finding } from "@/lib/scoring";
import {
  Activity, ShieldCheck, AlertTriangle, Copy, Download, BadgeCheck,
  Globe, Lock, Mail, Server, Building2, GraduationCap, Bug, ShoppingBag, Code2, Briefcase,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";

const PREV_KEY = (hostname: string) => `sentinel:prev:${hostname}`;

type ComplianceMode =
  | "startup" | "ecommerce" | "client" | "college" | "bounty" | "developer";

const COMPLIANCE: Record<ComplianceMode, { label: string; icon: typeof Building2; tone: string; summaryLabel: string; fixLabel: string }> = {
  startup:   { label: "Startup Security Report",  icon: Building2,       tone: "for founders & investors",      summaryLabel: "Executive summary",      fixLabel: "Top fixes for your team" },
  ecommerce: { label: "E-commerce Security Report", icon: ShoppingBag,   tone: "for store owners & PCI scope",  summaryLabel: "Storefront safety brief", fixLabel: "Checkout-critical fixes" },
  client:    { label: "Client Audit Report",      icon: Briefcase,       tone: "for delivery to a client",      summaryLabel: "Audit summary",           fixLabel: "Remediation backlog" },
  college:   { label: "College Project Report",   icon: GraduationCap,   tone: "for academic submission",       summaryLabel: "Project overview",        fixLabel: "Suggested improvements" },
  bounty:    { label: "Bug Bounty Report",        icon: Bug,             tone: "for triage teams",              summaryLabel: "Triage summary",          fixLabel: "Reproduction-ready findings" },
  developer: { label: "Developer Fix Report",     icon: Code2,           tone: "for engineering tickets",       summaryLabel: "Engineering brief",       fixLabel: "Patch checklist" },
};

export function ReportEnhancements({ result }: { result: ScanResult }) {
  const { findings, score, hostname, url, createdAt } = result;
  const [mode, setMode] = useState<ComplianceMode>("client");
  const [prev, setPrev] = useState<number | null>(null);

  // Read previous score from localStorage, then store the current one.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PREV_KEY(hostname));
      if (raw) setPrev(Number(JSON.parse(raw).score));
      localStorage.setItem(PREV_KEY(hostname), JSON.stringify({ score: score.total, at: Date.now() }));
    } catch { /* ignore */ }
  }, [hostname, score.total]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0, pass: 0 } as Record<string, number>;
    for (const f of findings) c[f.severity] = (c[f.severity] ?? 0) + 1;
    return c;
  }, [findings]);

  const total = counts.critical + counts.high + counts.medium + counts.low;
  const biggest = useMemo(
    () => findings.find((f) => f.severity === "critical") ?? findings.find((f) => f.severity === "high") ?? findings.find((f) => f.severity === "medium") ?? null,
    [findings],
  );
  const verdict = score.total >= 90 ? "Safe for users" : score.total >= 70 ? "Mostly safe — fixes recommended" : "Not safe — action required";
  const verdictTone = score.total >= 90 ? "text-success border-success/30 bg-success/5" : score.total >= 70 ? "text-warning border-warning/30 bg-warning/5" : "text-critical border-critical/30 bg-critical/5";

  const cfg = COMPLIANCE[mode];

  return (
    <div className="space-y-6">
      {/* Compliance mode dropdown */}
      <div className="flex flex-wrap items-center gap-3 border border-border bg-card rounded-md p-3 md:p-4">
        <span className="text-[10px] uppercase tracking-[0.3em] text-primary">// Report mode</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ComplianceMode)}
          className="bg-background border border-border rounded-sm text-xs px-3 py-1.5 font-mono focus:outline-none focus:border-primary"
        >
          {Object.entries(COMPLIANCE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <cfg.icon className="h-3.5 w-3.5" /> {cfg.tone}
        </span>
      </div>

      {/* Executive summary */}
      <div className="border border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent rounded-md p-5 md:p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// {cfg.summaryLabel}</div>
          <span className={`ml-auto text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border ${verdictTone}`}>{verdict}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border rounded-sm overflow-hidden mb-4">
          <Stat label="Score" value={`${score.total}/100`} />
          <Stat label="Total issues" value={total} />
          <Stat label="Critical" value={counts.critical} tone={counts.critical ? "critical" : "muted"} />
          <Stat label="High" value={counts.high} tone={counts.high ? "warning" : "muted"} />
          <Stat label="Medium" value={counts.medium} tone={counts.medium ? "warning" : "muted"} />
        </div>
        <div className="text-sm leading-relaxed text-foreground/90">
          <p>
            <span className="text-primary font-medium">Biggest risk:</span>{" "}
            {biggest ? biggest.title : "No critical or high-severity issues detected in this scan."}
          </p>
          {biggest?.recommendation && (
            <p className="mt-2">
              <span className="text-primary font-medium">{cfg.fixLabel}:</span> {biggest.recommendation}
            </p>
          )}
        </div>
      </div>

      {/* Before/After comparison */}
      <BeforeAfter prev={prev} current={score.total} hostname={hostname} />

      {/* Threat intelligence + tech/CVE side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ThreatIntel findings={findings} hostname={hostname} />
        <TechCves findings={findings} />
      </div>

      {/* Trust badge */}
      <TrustBadge url={url} hostname={hostname} score={score.total} createdAt={createdAt} counts={counts} />
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "critical" | "warning" | "muted" }) {
  const cls =
    tone === "critical" ? "text-critical" :
    tone === "warning" ? "text-warning" :
    tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="bg-card p-3">
      <div className={`text-xl md:text-2xl font-bold tabular-nums ${cls}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function BeforeAfter({ prev, current, hostname }: { prev: number | null; current: number; hostname: string }) {
  const hasPrev = prev != null && !Number.isNaN(prev);
  const delta = hasPrev ? current - prev! : 0;
  const pct = hasPrev && prev! > 0 ? Math.round((delta / prev!) * 100) : 0;
  const Trend = !hasPrev ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone = !hasPrev ? "text-muted-foreground" : delta > 0 ? "text-success" : delta < 0 ? "text-critical" : "text-muted-foreground";

  return (
    <div className="border border-border bg-card rounded-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// Before / After</div>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{hostname}</span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
        <div className="bg-background p-4 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Previous</div>
          <div className="text-2xl font-bold tabular-nums">{hasPrev ? prev : "—"}</div>
        </div>
        <div className="bg-background p-4 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Current</div>
          <div className="text-2xl font-bold tabular-nums text-primary">{current}</div>
        </div>
        <div className="bg-background p-4 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Change</div>
          <div className={`text-2xl font-bold tabular-nums inline-flex items-center gap-1 ${tone}`}>
            <Trend className="h-5 w-5" />
            {hasPrev ? `${delta > 0 ? "+" : ""}${delta}` : "—"}
          </div>
          {hasPrev && <div className={`text-[10px] font-mono mt-0.5 ${tone}`}>{delta > 0 ? "+" : ""}{pct}%</div>}
        </div>
      </div>
      {!hasPrev && (
        <p className="text-[11px] text-muted-foreground mt-3">
          Re-scan this domain to see improvement vs. the current baseline. Needs verification — previous results
          are cached on this device only.
        </p>
      )}
    </div>
  );
}

function ThreatIntel({ findings, hostname }: { findings: Finding[]; hostname: string }) {
  const has = (cat: string) => findings.some((f) => f.category === cat && f.severity !== "pass" && f.severity !== "info");
  const sslPass = !has("tls");
  const headersClean = !has("headers");
  const dnsClean = !has("dns");
  const repBad = findings.some((f) => f.category === "reputation" && (f.severity === "critical" || f.severity === "high"));

  const items = [
    { icon: Globe,  label: "Domain reputation", status: repBad ? "Suspicious" : "Needs verification" },
    { icon: Server, label: "IP reputation",     status: repBad ? "Risky" : "Safe" },
    { icon: Lock,   label: "SSL trust",         status: sslPass ? "Safe" : "Suspicious" },
    { icon: ShieldCheck, label: "Blacklist status", status: "Needs verification" },
    { icon: AlertTriangle, label: "Phishing risk", status: "Needs verification" },
    { icon: Mail, label: "DNS / email security", status: dnsClean ? "Safe" : "Suspicious" },
  ];

  return (
    <div className="border border-border bg-card rounded-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// Threat intelligence</div>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono truncate max-w-[50%]">{hostname}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 border border-border/60 rounded-sm px-3 py-2 bg-background/40">
            <it.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs flex-1 min-w-0 truncate">{it.label}</span>
            <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0 ${tiToneCls(it.status)}`}>
              {it.status}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        Reputation feeds shown as placeholders until paid intel APIs are wired in. Headers/TLS/DNS signals are live.
      </p>
      {headersClean && sslPass && dnsClean && (
        <p className="text-[10px] text-success mt-1">All scanned signals look clean for this domain.</p>
      )}
    </div>
  );
}

function tiToneCls(status: string) {
  if (status === "Safe") return "border-success/30 text-success bg-success/5";
  if (status === "Risky") return "border-critical/30 text-critical bg-critical/5";
  if (status === "Suspicious") return "border-warning/30 text-warning bg-warning/5";
  return "border-border text-muted-foreground bg-secondary/30";
}

function TechCves({ findings }: { findings: Finding[] }) {
  // Crude tech detection from "exposure" findings that leak Server / X-Powered-By style values.
  const techs = useMemo(() => {
    const out: Array<{ name: string; version?: string; severity: string; cve: string; rec: string }> = [];
    for (const f of findings) {
      if (f.category !== "exposure") continue;
      const m = /(server|x-powered-by|via)[^:]*:\s*([^\n,]+)/i.exec(f.detail);
      if (!m) continue;
      const raw = m[2].trim().split(/\s+/).slice(0, 2).join(" ");
      const vm = /(\d+(?:\.\d+)+)/.exec(raw);
      out.push({
        name: raw.replace(/[\d.]+$/, "").trim() || raw,
        version: vm?.[1],
        severity: f.severity,
        cve: "Needs manual verification",
        rec: f.recommendation ?? "Hide version banners and patch to latest stable.",
      });
    }
    return out;
  }, [findings]);

  return (
    <div className="border border-border bg-card rounded-md p-5">
      <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4">// Detected tech &amp; CVE hints</div>
      {techs.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No version banners leaked in this scan. CVE lookup needs an exposed library/version string to be useful.
        </p>
      ) : (
        <div className="space-y-2">
          {techs.slice(0, 8).map((t, i) => (
            <div key={i} className="border border-border/60 rounded-sm p-3 bg-background/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{t.name}</span>
                {t.version && <span className="text-[10px] font-mono text-primary">v{t.version}</span>}
                <span className="ml-auto text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-warning/30 text-warning bg-warning/5">
                  {t.severity}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5">CVE: <span className="font-mono">{t.cve}</span></div>
              <div className="text-[11px] mt-1">{t.rec}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrustBadge({ url, hostname, score, createdAt, counts }: {
  url: string; hostname: string; score: number; createdAt: string; counts: Record<string, number>;
}) {
  const noCritical = (counts.critical ?? 0) === 0;
  const claims = [
    score >= 70 ? "Security Improved" : "Baseline Captured",
    noCritical ? "No Critical Issues Found" : "Critical Issues Present — Not Eligible",
    url.startsWith("https://") ? "HTTPS Verified" : "HTTPS Missing",
    counts.high === 0 ? "Headers Improved" : "Headers Need Work",
    score >= 60 ? "Basic Security Verified" : "Basic Security Incomplete",
  ];

  const embed = `<a href="https://sentinelweb-scan.lovable.app" target="_blank" rel="noopener">
  <img src="https://sentinelweb-scan.lovable.app/badge.svg?host=${encodeURIComponent(hostname)}&score=${score}" alt="Sentinel AI Security Badge" />
</a>`;

  function copyEmbed() {
    navigator.clipboard?.writeText(embed).catch(() => {});
  }

  return (
    <div className="border border-primary/30 rounded-md p-5 md:p-6 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent">
      <div className="flex items-center gap-2 mb-4">
        <BadgeCheck className="h-4 w-4 text-primary" />
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// Trust badge preview</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-5 items-start">
        <div className="border border-border bg-background rounded-md p-4 w-full md:w-72">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span className="text-xs font-semibold uppercase tracking-widest">Sentinel Verified</span>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground truncate">{hostname}</div>
          <div className="flex items-end gap-2 mt-3">
            <span className="text-3xl font-bold text-primary tabular-nums">{score}</span>
            <span className="text-[10px] text-muted-foreground mb-1">/ 100</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Scanned {new Date(createdAt).toLocaleDateString()}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={copyEmbed} className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest border border-border rounded-sm py-1.5 hover:border-primary hover:text-primary transition">
              <Copy className="h-3 w-3" /> Embed
            </button>
            <button
              onClick={() => {
                const blob = new Blob([badgeSvg(hostname, score)], { type: "image/svg+xml" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `sentinel-badge-${hostname}.svg`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest border border-border rounded-sm py-1.5 hover:border-primary hover:text-primary transition"
            >
              <Download className="h-3 w-3" /> SVG
            </button>
          </div>
        </div>
        <div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
            {claims.map((c, i) => (
              <li key={i} className="text-xs flex items-center gap-2 border border-border/60 rounded-sm px-2.5 py-1.5 bg-background/40">
                <span className={`h-1.5 w-1.5 rounded-full ${c.includes("Missing") || c.includes("Not Eligible") || c.includes("Need") || c.includes("Incomplete") || c.includes("Present") ? "bg-warning" : "bg-success"}`} />
                {c}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground">
            Sentinel never claims a site is &quot;100% secure&quot;. The badge reflects only checks performed at scan time.
          </p>
        </div>
      </div>
    </div>
  );
}

function badgeSvg(hostname: string, score: number) {
  const color = score >= 90 ? "#16a34a" : score >= 70 ? "#eab308" : "#dc2626";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="48" viewBox="0 0 220 48"><rect width="220" height="48" rx="6" fill="#0b0f17"/><rect x="0" width="80" height="48" rx="6" fill="${color}"/><text x="40" y="30" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="#fff">${score}</text><text x="92" y="20" font-family="Arial" font-size="11" fill="#9ca3af">Sentinel AI</text><text x="92" y="36" font-family="Arial" font-size="11" fill="#fff">${hostname.slice(0, 18)}</text></svg>`;
}
