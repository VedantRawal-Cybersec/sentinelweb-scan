import type { ScanResult } from "@/lib/scanner.functions";
import { SEVERITY_COLORS, type Finding } from "@/lib/scoring";
import { useState } from "react";
import {
  ChevronDown, ChevronRight, ShieldCheck, ShieldAlert,
  AlertTriangle, Info, Brain, Sparkles, Crosshair, Bug, Target, Wrench, BookOpen,
} from "lucide-react";

export function ScanResults({ result }: { result: ScanResult }) {
  const { score, findings, hostname, aiReport } = result;
  const grouped = groupByCategory(findings);

  return (
    <div className="space-y-6 md:space-y-8">
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

      {aiReport && (
        <div className="border border-primary/30 bg-primary/[0.03] rounded-md p-5 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            <div className="text-xs uppercase tracking-[0.3em] text-primary">// AI Deep Assessment</div>
            <Sparkles className="h-3.5 w-3.5 text-primary ml-auto" />
          </div>
          <p className="text-sm md:text-base leading-relaxed mb-6">{aiReport.executiveSummary}</p>

          {aiReport.attackerNarrative && (
            <div className="mb-6 border border-critical/30 bg-critical/5 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crosshair className="h-4 w-4 text-critical" />
                <div className="text-[10px] uppercase tracking-widest text-critical">Attacker Narrative</div>
              </div>
              <p className="text-sm leading-relaxed">{aiReport.attackerNarrative}</p>
            </div>
          )}

          <div className="space-y-3">
            {aiReport.topRisks.map((r, i) => (
              <details key={i} className="border border-border bg-background rounded-sm group" open={i === 0}>
                <summary className="cursor-pointer list-none p-4 flex items-center gap-3 flex-wrap">
                  <ChevronRight className="h-4 w-4 transition group-open:rotate-90 text-muted-foreground shrink-0" />
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm border ${sevBadge(r.severity)}`}>{r.severity}</span>
                  <span className="font-semibold text-sm flex-1 min-w-[12rem]">{r.title}</span>
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
            ))}
          </div>

          {aiReport.roadmap && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Roadmap</div>
              <p className="text-sm">{aiReport.roadmap}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, items]) => (
          <CategorySection key={cat} category={cat} findings={items} />
        ))}
      </div>
    </div>
  );
}

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

function CategorySection({ category, findings }: { category: string; findings: Finding[] }) {
  const [open, setOpen] = useState(true);
  const failing = findings.filter((f) => f.severity !== "pass").length;
  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-sm font-semibold uppercase tracking-widest">{category}</span>
          <span className="text-xs text-muted-foreground">{findings.length} checks</span>
        </div>
        {failing > 0 ? (
          <span className="text-xs text-critical">{failing} issue{failing > 1 ? "s" : ""}</span>
        ) : (
          <span className="text-xs text-success flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Clean</span>
        )}
      </button>
      {open && (
        <div className="divide-y divide-border">
          {findings.map((f) => <FindingRow key={f.id} f={f} />)}
        </div>
      )}
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const Icon = f.severity === "pass" ? ShieldCheck : f.severity === "critical" || f.severity === "high" ? ShieldAlert : f.severity === "medium" ? AlertTriangle : Info;
  return (
    <div className="p-4 flex gap-3">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${SEVERITY_COLORS[f.severity]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{f.title}</span>
          <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${sevBadge(f.severity)}`}>{f.severity}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 font-mono break-words whitespace-pre-wrap">{f.detail}</p>
        {f.recommendation && (
          <p className="text-xs mt-2 text-foreground/80">→ {f.recommendation}</p>
        )}
      </div>
    </div>
  );
}

function groupByCategory(findings: Finding[]): Record<string, Finding[]> {
  const out: Record<string, Finding[]> = {};
  for (const f of findings) (out[f.category] ??= []).push(f);
  return out;
}

function sevBadge(s: string): string {
  const v = s.toLowerCase();
  if (v === "critical" || v === "high") return "border-critical/30 text-critical bg-critical/10";
  if (v === "medium") return "border-warning/30 text-warning bg-warning/10";
  if (v === "pass") return "border-success/30 text-success bg-success/10";
  return "border-border text-muted-foreground bg-secondary/30";
}
