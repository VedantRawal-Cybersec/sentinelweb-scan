import type { ScanResult, HistoryBundle } from "@/lib/scanner.functions";
import { SEVERITY_COLORS, type Finding } from "@/lib/scoring";
import { useMemo, useState } from "react";
import {
  ChevronRight, ShieldCheck, ShieldAlert,
  AlertTriangle, Info, Brain, Sparkles, Crosshair, Bug, Target, Wrench, BookOpen,
  History, ExternalLink, Filter, ArrowUpDown, Download,
} from "lucide-react";
import { ProofPanel, ProofBadge } from "./ProofPanel";
import { ReportEnhancements } from "./ReportEnhancements";
import { toast } from "sonner";

type Tab = "ai" | "history" | "raw";

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4, pass: 5 };

export function ScanResults({ result }: { result: ScanResult }) {
  const { score, findings, hostname, aiReport, history, url } = result;
  const [tab, setTab] = useState<Tab>("ai");

  const proofSummary = useMemo(() => {
    const acc: Record<string, number> = { verified: 0, "high-confidence": 0, potential: 0, "needs-review": 0, "encoded-safe": 0, "not-vulnerable": 0 };
    for (const f of findings) if (f.proof) acc[f.proof.level] = (acc[f.proof.level] ?? 0) + 1;
    return acc;
  }, [findings]);

  function exportProofReport() {
    const payload = {
      generatedAt: new Date().toISOString(),
      target: { url, hostname },
      score,
      proofSummary,
      findings: findings.map((f) => ({
        id: f.id, title: f.title, category: f.category, severity: f.severity,
        detail: f.detail, recommendation: f.recommendation, proof: f.proof,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sentinel-proof-${hostname}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Score card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
        <div className="lg:col-span-1 bg-card p-6 md:p-8 flex flex-col items-center justify-center">
          <ScoreRing score={score.total} />
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-4">{score.label}</div>
          <div className="text-sm font-mono mt-1 break-all text-center">{hostname}</div>
        </div>
        <div className="lg:col-span-2 bg-card p-6 md:p-8 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// Category breakdown</div>
          {Object.entries(score.byCategory).map(([cat, b]) => (
            <CategoryBar key={cat} label={cat} score={b.score} />
          ))}
        </div>
      </div>

      {/* Proof summary strip */}
      <div className="border border-border bg-card rounded-md p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// Proof Engine</div>
          <button
            onClick={exportProofReport}
            className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary hover:underline"
          >
            <Download className="h-3 w-3" /> Export proof JSON
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <ProofStat label="Verified"          n={proofSummary.verified}          tone="critical" />
          <ProofStat label="High confidence"   n={proofSummary["high-confidence"]} tone="warning" />
          <ProofStat label="Potential"         n={proofSummary.potential}         tone="warning" />
          <ProofStat label="Needs review"      n={proofSummary["needs-review"]}   tone="muted" />
          <ProofStat label="Encoded / safe"    n={proofSummary["encoded-safe"]}   tone="success" />
          <ProofStat label="Not vulnerable"    n={proofSummary["not-vulnerable"]} tone="success" />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Every finding includes a <span className="text-primary">Why This Is Real</span> panel with detection method,
          safe evidence, what is confirmed vs. unconfirmed, and a safe retest. Sentinel never claims 100% exploitability without reproduction.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto -mx-1 px-1 scrollbar-thin">
        <TabBtn active={tab === "ai"} onClick={() => setTab("ai")} icon={<Brain className="h-3.5 w-3.5" />}>AI Assessment</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={<History className="h-3.5 w-3.5" />}>
          Bug History {history && (history.nvd.length + history.hackerone.length) > 0 ? <span className="ml-1 text-[10px] text-primary">{history.nvd.length + history.hackerone.length}</span> : null}
        </TabBtn>
        <TabBtn active={tab === "raw"} onClick={() => setTab("raw")} icon={<ShieldCheck className="h-3.5 w-3.5" />}>Raw Findings ({findings.length})</TabBtn>
      </div>

      {tab === "ai" && aiReport && <AiAssessment report={aiReport} />}
      {tab === "ai" && !aiReport && <EmptyTab text="AI assessment unavailable." />}
      {tab === "history" && <HistoryView history={history} hostname={hostname} />}
      {tab === "raw" && <RawFindings findings={findings} scanUrl={url} />}
    </div>

  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{children}
    </button>
  );
}

function EmptyTab({ text }: { text: string }) {
  return <div className="border border-dashed border-border rounded-md p-10 text-center text-sm text-muted-foreground">{text}</div>;
}

/* -------- AI Assessment with filters -------- */

function AiAssessment({ report }: { report: NonNullable<ScanResult["aiReport"]> }) {
  const [sevFilter, setSevFilter] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [owaspFilter, setOwaspFilter] = useState<string | null>(null);
  const [cweFilter, setCweFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"severity" | "effort">("severity");

  const { categories, owasps, cwes } = useMemo(() => {
    const cats = new Set<string>();
    const ow = new Set<string>();
    const cw = new Set<string>();
    for (const r of report.topRisks) {
      if (r.category) cats.add(r.category);
      if (r.owasp) ow.add(r.owasp);
      if (r.cwe) cw.add(r.cwe);
    }
    return { categories: [...cats].sort(), owasps: [...ow].sort(), cwes: [...cw].sort() };
  }, [report.topRisks]);

  const filtered = useMemo(() => {
    const list = report.topRisks.filter((r) => {
      if (sevFilter && r.severity.toLowerCase() !== sevFilter) return false;
      if (catFilter && r.category !== catFilter) return false;
      if (owaspFilter && r.owasp !== owaspFilter) return false;
      if (cweFilter && r.cwe !== cweFilter) return false;
      return true;
    });
    if (sortBy === "severity") {
      list.sort((a, b) => (SEV_ORDER[a.severity.toLowerCase()] ?? 9) - (SEV_ORDER[b.severity.toLowerCase()] ?? 9));
    }
    return list;
  }, [report.topRisks, sevFilter, catFilter, owaspFilter, cweFilter, sortBy]);

  const anyFilter = sevFilter || catFilter || owaspFilter || cweFilter;

  return (
    <div className="border border-primary/30 bg-primary/[0.03] rounded-md p-5 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-primary" />
        <div className="text-xs uppercase tracking-[0.3em] text-primary">// AI Deep Assessment</div>
        <Sparkles className="h-3.5 w-3.5 text-primary ml-auto" />
      </div>
      <p className="text-sm md:text-base leading-relaxed mb-6">{report.executiveSummary}</p>

      {report.attackerNarrative && (
        <div className="mb-6 border border-critical/30 bg-critical/5 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="h-4 w-4 text-critical" />
            <div className="text-[10px] uppercase tracking-widest text-critical">Attacker Narrative</div>
          </div>
          <p className="text-sm leading-relaxed">{report.attackerNarrative}</p>
        </div>
      )}

      {/* Filter / sort controls */}
      <div className="mb-4 space-y-2.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Filter className="h-3 w-3" /> Filter
          {anyFilter && (
            <button
              onClick={() => { setSevFilter(null); setCatFilter(null); setOwaspFilter(null); setCweFilter(null); }}
              className="ml-auto text-primary normal-case tracking-normal hover:underline"
            >
              clear all
            </button>
          )}
        </div>

        <ChipRow label="Severity" value={sevFilter} setValue={setSevFilter} options={["critical","high","medium","low"]} />
        {categories.length > 0 && <ChipRow label="Category" value={catFilter} setValue={setCatFilter} options={categories} />}
        {owasps.length > 0 && <ChipRow label="OWASP" value={owaspFilter} setValue={setOwaspFilter} options={owasps} mono />}
        {cwes.length > 0 && <ChipRow label="CWE" value={cweFilter} setValue={setCweFilter} options={cwes} mono />}

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground pt-1">
          <ArrowUpDown className="h-3 w-3" /> Sort
          <button
            onClick={() => setSortBy(sortBy === "severity" ? "effort" : "severity")}
            className="ml-1 normal-case tracking-normal text-primary hover:underline"
          >
            by {sortBy}
          </button>
          <span className="ml-auto font-mono normal-case tracking-normal">{filtered.length}/{report.topRisks.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded-sm p-6 text-center text-xs text-muted-foreground">
            No risks match the current filters.
          </div>
        ) : filtered.map((r, i) => <RiskRow key={`${r.title}-${i}`} r={r} defaultOpen={i === 0} />)}
      </div>

      {report.roadmap && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Roadmap</div>
          <p className="text-sm">{report.roadmap}</p>
        </div>
      )}
    </div>
  );
}

function ChipRow({ label, value, setValue, options, mono = false }: {
  label: string; value: string | null; setValue: (v: string | null) => void; options: string[]; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground pt-1.5 w-16 shrink-0">{label}</div>
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              onClick={() => setValue(active ? null : o)}
              className={`px-2.5 py-1 rounded-sm border text-[10px] uppercase tracking-widest transition ${mono ? "font-mono" : ""} ${
                active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiskRow({ r, defaultOpen }: { r: NonNullable<ScanResult["aiReport"]>["topRisks"][number]; defaultOpen: boolean }) {
  return (
    <details className="border border-border bg-background rounded-sm group" open={defaultOpen}>
      <summary className="cursor-pointer list-none p-4 flex items-center gap-3 flex-wrap">
        <ChevronRight className="h-4 w-4 transition group-open:rotate-90 text-muted-foreground shrink-0" />
        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm border ${sevBadge(r.severity)}`}>{r.severity}</span>
        <span className="font-semibold text-sm flex-1 min-w-[10rem]">{r.title}</span>
        {r.cvss && <span className="text-[10px] font-mono text-muted-foreground">CVSS {r.cvss}</span>}
        <span className="text-xs text-muted-foreground">{r.estimatedEffort}</span>
      </summary>
      <div className="px-4 pb-4 md:pl-11 space-y-4 text-sm">
        <div className="flex flex-wrap gap-2 text-[10px]">
          {r.owasp && <span className="px-2 py-0.5 border border-border rounded-sm font-mono">{r.owasp}</span>}
          {r.cwe && <span className="px-2 py-0.5 border border-border rounded-sm font-mono">{r.cwe}</span>}
          {r.category && <span className="px-2 py-0.5 border border-border rounded-sm font-mono">{r.category}</span>}
        </div>
        <Field icon={<Target className="h-3.5 w-3.5" />} label="Impact">{r.impact}</Field>
        {r.attackVector && <Field icon={<Crosshair className="h-3.5 w-3.5" />} label="Attack vector">{r.attackVector}</Field>}
        {r.exploitationSteps && r.exploitationSteps.length > 0 && (
          <div>
            <Label icon={<Bug className="h-3.5 w-3.5" />}>Exploitation steps</Label>
            <ol className="mt-2 space-y-1.5 list-decimal list-inside text-sm text-foreground/90">
              {r.exploitationSteps.map((s, k) => <li key={k}>{s}</li>)}
            </ol>
          </div>
        )}
        {r.proofOfConcept && (
          <div>
            <Label icon={<Bug className="h-3.5 w-3.5" />}>Proof of concept</Label>
            <pre className="bg-secondary p-3 rounded-sm text-xs font-mono overflow-x-auto whitespace-pre-wrap mt-2">{r.proofOfConcept}</pre>
          </div>
        )}
        <Field icon={<Wrench className="h-3.5 w-3.5" />} label="Fix">{r.remediation}</Field>
        {r.codeExample && (
          <pre className="bg-secondary p-3 rounded-sm text-xs font-mono overflow-x-auto whitespace-pre-wrap">{r.codeExample}</pre>
        )}
        {r.references && r.references.length > 0 && (
          <div>
            <Label icon={<BookOpen className="h-3.5 w-3.5" />}>References</Label>
            <ul className="mt-1.5 space-y-1">
              {r.references.map((u, k) => (
                <li key={k}><a href={u} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline break-all">{u}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

/* -------- History tab -------- */

function HistoryView({ history, hostname }: { history: HistoryBundle | null | undefined; hostname: string }) {
  if (!history || (history.nvd.length === 0 && history.hackerone.length === 0 && !history.aiContext)) {
    return <EmptyTab text="No public bug-bounty / CVE history found for this domain." />;
  }
  return (
    <div className="space-y-6">
      {history.aiContext && (
        <div className="border border-primary/30 bg-primary/[0.03] rounded-md p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// Historical context for {hostname}</div>
          </div>
          <p className="text-sm leading-relaxed">{history.aiContext}</p>
          {history.categorized && Object.keys(history.categorized).length > 0 && (
            <div className="mt-5 space-y-3">
              {Object.entries(history.categorized).map(([cat, bullets]) => (
                bullets.length > 0 && (
                  <div key={cat}>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{cat}</div>
                    <ul className="text-sm space-y-1 list-disc list-inside text-foreground/90">
                      {bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {history.nvd.length > 0 && (
        <HistorySection title={`NVD CVEs (${history.nvd.length})`} items={history.nvd} />
      )}
      {history.hackerone.length > 0 && (
        <HistorySection title={`HackerOne disclosed (${history.hackerone.length})`} items={history.hackerone} />
      )}
    </div>
  );
}

function HistorySection({ title, items }: { title: string; items: HistoryBundle["nvd"] }) {
  return (
    <div className="border border-border bg-card rounded-md overflow-hidden">
      <div className="px-5 py-3 border-b border-border text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{title}</div>
      <div className="divide-y divide-border">
        {items.map((it) => (
          <div key={it.id} className="p-4">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-mono text-xs text-primary">{it.id}</span>
              {it.severity && <span className="text-[10px] px-2 py-0.5 border border-border rounded-sm">{it.severity}</span>}
              {it.publishedAt && <span className="text-[10px] text-muted-foreground">{new Date(it.publishedAt).toLocaleDateString()}</span>}
              {it.url && (
                <a href={it.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary text-xs hover:underline inline-flex items-center gap-1">
                  view <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {it.summary && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{it.summary}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- Raw findings tab with filters -------- */

function RawFindings({ findings, scanUrl }: { findings: Finding[]; scanUrl: string }) {
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<string | null>(null);
  const [proofFilter, setProofFilter] = useState<string | null>(null);

  const cats = useMemo(() => [...new Set(findings.map((f) => f.category))], [findings]);
  const filtered = useMemo(() => findings
    .filter((f) => (!catFilter || f.category === catFilter) && (!sevFilter || f.severity === sevFilter) && (!proofFilter || f.proof?.level === proofFilter))
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)),
    [findings, catFilter, sevFilter, proofFilter]);

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <ChipRow label="Category" value={catFilter} setValue={setCatFilter} options={cats} />
        <ChipRow label="Severity" value={sevFilter} setValue={setSevFilter} options={["critical","high","medium","low","pass"]} />
        <ChipRow label="Proof" value={proofFilter} setValue={setProofFilter} options={["verified","high-confidence","potential","needs-review","encoded-safe","not-vulnerable"]} />
      </div>
      <div className="border border-border rounded-md bg-card divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No findings match.</div>
        ) : filtered.map((f) => <FindingRow key={f.id} f={f} scanUrl={scanUrl} />)}
      </div>
    </div>
  );
}


/* -------- Shared bits -------- */

function Label({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
      {icon}{children}
    </span>
  );
}
function Field({ children, icon, label }: { children: React.ReactNode; icon: React.ReactNode; label: string }) {
  return (
    <div>
      <Label icon={icon}>{label}</Label>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? "hsl(var(--success))" : score >= 70 ? "hsl(var(--warning))" : "hsl(var(--critical))";
  const circ = 2 * Math.PI * 56;
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative h-36 w-36 md:h-40 md:w-40">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r="56" stroke="hsl(var(--border))" strokeWidth="8" fill="none" />
        <circle cx="64" cy="64" r="56" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold tabular-nums" style={{ color }}>{score}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function CategoryBar({ label, score }: { label: string; score: number }) {
  const color = score >= 90 ? "bg-success" : score >= 70 ? "bg-warning" : "bg-critical";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{score}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function FindingRow({ f, scanUrl }: { f: Finding; scanUrl: string }) {
  const Icon = f.severity === "pass" ? ShieldCheck : f.severity === "critical" || f.severity === "high" ? ShieldAlert : f.severity === "medium" ? AlertTriangle : Info;
  return (
    <div className="p-4 flex gap-3">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${SEVERITY_COLORS[f.severity]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{f.title}</span>
          <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${sevBadge(f.severity)}`}>{f.severity}</span>
          {f.proof && <ProofBadge proof={f.proof} />}
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground ml-auto">{f.category}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 font-mono break-words whitespace-pre-wrap">{f.detail}</p>
        {f.proof && <ProofPanel finding={f} scanUrl={scanUrl} />}
      </div>
    </div>
  );
}

function ProofStat({ label, n, tone }: { label: string; n: number; tone: "critical" | "warning" | "success" | "muted" }) {
  const toneCls =
    tone === "critical" ? "text-critical border-critical/30" :
    tone === "warning"  ? "text-warning border-warning/30" :
    tone === "success"  ? "text-success border-success/30" :
    "text-muted-foreground border-border";
  return (
    <div className={`border rounded-sm px-3 py-2 ${toneCls}`}>
      <div className="text-2xl font-bold tabular-nums leading-none">{n}</div>
      <div className="text-[9px] uppercase tracking-widest mt-1 opacity-80">{label}</div>
    </div>
  );
}


function sevBadge(s: string): string {
  const v = s.toLowerCase();
  if (v === "critical" || v === "high") return "border-critical/30 text-critical bg-critical/10";
  if (v === "medium") return "border-warning/30 text-warning bg-warning/10";
  if (v === "pass") return "border-success/30 text-success bg-success/10";
  return "border-border text-muted-foreground bg-secondary/30";
}
