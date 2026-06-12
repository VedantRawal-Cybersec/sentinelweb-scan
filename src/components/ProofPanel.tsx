import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck, AlertTriangle, ShieldAlert, Search, Lock, Clock,
  CheckCircle2, XCircle, HelpCircle, RefreshCw, Loader2, FileSearch,
} from "lucide-react";
import type { Finding, Proof, ProofLevel } from "@/lib/scoring";
import { retestFinding } from "@/lib/scanner.functions";

const LEVEL_STYLES: Record<ProofLevel, { ring: string; chip: string; bar: string; icon: React.ReactNode }> = {
  verified:          { ring: "text-critical",         chip: "border-critical/40 text-critical bg-critical/10", bar: "bg-critical",  icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  "high-confidence": { ring: "text-warning",          chip: "border-warning/40 text-warning bg-warning/10",    bar: "bg-warning",   icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  potential:         { ring: "text-warning",          chip: "border-warning/30 text-warning bg-warning/5",     bar: "bg-warning/70",icon: <FileSearch className="h-3.5 w-3.5" /> },
  "needs-review":    { ring: "text-muted-foreground", chip: "border-border text-muted-foreground bg-secondary/30", bar: "bg-muted-foreground", icon: <HelpCircle className="h-3.5 w-3.5" /> },
  "encoded-safe":    { ring: "text-success",          chip: "border-success/30 text-success bg-success/10",    bar: "bg-success",   icon: <Lock className="h-3.5 w-3.5" /> },
  "not-vulnerable":  { ring: "text-success",          chip: "border-success/30 text-success bg-success/10",    bar: "bg-success",   icon: <ShieldCheck className="h-3.5 w-3.5" /> },
};

export function ProofBadge({ proof }: { proof: Proof }) {
  const s = LEVEL_STYLES[proof.level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[10px] uppercase tracking-widest ${s.chip}`}>
      {s.icon}{proof.label}
    </span>
  );
}

export function ProofPanel({ finding, scanUrl }: { finding: Finding; scanUrl: string }) {
  const [open, setOpen] = useState(false);
  const [currentProof, setCurrentProof] = useState<Proof | null>(finding.proof ?? null);
  const retestFn = useServerFn(retestFinding);

  const retest = useMutation({
    mutationFn: () => retestFn({ data: { url: scanUrl, findingId: finding.id } }),
    onSuccess: (res) => {
      if (res.finding?.proof) {
        setCurrentProof(res.finding.proof);
        toast.success(`Retest complete · ${res.finding.proof.label}`);
      } else {
        toast.success("Retest complete · issue no longer reproduces");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Retest failed"),
  });

  if (!currentProof) return null;
  const s = LEVEL_STYLES[currentProof.level];

  return (
    <div className="mt-3 border border-border rounded-sm bg-secondary/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/40 transition"
      >
        <FileSearch className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10px] uppercase tracking-widest text-primary">Why this is real</span>
        <ProofBadge proof={currentProof} />
        <span className={`ml-auto text-xs font-mono tabular-nums ${s.ring}`}>{currentProof.score}/100</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t border-border bg-background/60">
          {/* Score + outcome */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-center">
            <ScoreDial score={currentProof.score} colorClass={s.ring} />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Final outcome</div>
              <p className="text-sm leading-relaxed">{currentProof.outcome}</p>
              {currentProof.manualReviewRequired && (
                <p className="text-[11px] text-warning mt-1.5">Manual review recommended before action.</p>
              )}
            </div>
          </div>

          {/* Detection meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <Meta label="Module">{currentProof.module}</Meta>
            <Meta label="Detection">{currentProof.detectionMethod}</Meta>
            {currentProof.testedUrl && <Meta label="Tested URL" mono>{currentProof.testedUrl}</Meta>}
            {currentProof.parameter && <Meta label="Parameter" mono>{currentProof.parameter}</Meta>}
            {currentProof.context && <Meta label="Context">{currentProof.context}</Meta>}
            <Meta label="Tools agreed">{currentProof.toolsAgreed}</Meta>
            <Meta label="Reproduced">{currentProof.reproduced ? "yes (safe retest)" : "no"}</Meta>
            <Meta label="Detected at">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(currentProof.detectedAt).toLocaleString()}</span>
            </Meta>
          </div>

          {/* Evidence (safe) */}
          {currentProof.evidence.length > 0 && (
            <EvidenceList title="Safe evidence" items={currentProof.evidence} icon={<Search className="h-3 w-3" />} />
          )}

          {/* Confirmed / Not confirmed / Missing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PillList title="What is confirmed" items={currentProof.confirmed} tone="success" icon={<CheckCircle2 className="h-3 w-3" />} />
            <PillList title="What is not confirmed" items={currentProof.notConfirmed} tone="muted" icon={<XCircle className="h-3 w-3" />} />
            <PillList title="Missing evidence" items={currentProof.missing} tone="warning" icon={<HelpCircle className="h-3 w-3" />} />
          </div>

          {finding.recommendation && (
            <div className="border-t border-border pt-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Recommended fix</div>
              <p className="text-xs text-foreground/90">{finding.recommendation}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => retest.mutate()}
              disabled={retest.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary/40 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 transition disabled:opacity-50"
            >
              {retest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {retest.isPending ? "Retesting" : "Safe retest"}
            </button>
            <span className="text-[10px] text-muted-foreground self-center">In-scope re-check only · no destructive payloads</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-xs ${mono ? "font-mono break-all" : ""}`}>{children}</div>
    </div>
  );
}

function EvidenceList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {icon}{title}
      </div>
      <ul className="space-y-1">
        {items.map((e, i) => (
          <li key={i} className="text-xs font-mono bg-secondary/40 border border-border rounded-sm px-2 py-1.5 break-words">
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PillList({ title, items, tone, icon }: { title: string; items: string[]; tone: "success" | "warning" | "muted"; icon: React.ReactNode }) {
  const toneCls =
    tone === "success" ? "border-success/30 text-success" :
    tone === "warning" ? "border-warning/30 text-warning" :
    "border-border text-muted-foreground";
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {icon}{title}
      </div>
      {items.length === 0 ? (
        <div className="text-[11px] text-muted-foreground italic">—</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className={`text-[11px] border ${toneCls} bg-background rounded-sm px-2 py-1 leading-snug`}>
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoreDial({ score, colorClass }: { score: number; colorClass: string }) {
  const circ = 2 * Math.PI * 22;
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r="22" stroke="hsl(var(--border))" strokeWidth="4" fill="none" />
        <circle cx="28" cy="28" r="22" strokeWidth="4" fill="none" strokeLinecap="round"
          className={colorClass}
          stroke="currentColor"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold tabular-nums ${colorClass}`}>{score}</span>
      </div>
    </div>
  );
}
