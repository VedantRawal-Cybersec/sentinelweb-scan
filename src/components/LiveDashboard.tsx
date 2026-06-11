import { useEffect, useRef, useState } from "react";
import { Activity, Globe, Lock, Server, Database, Brain, Network, ShieldCheck } from "lucide-react";

interface Stage {
  key: string;
  label: string;
  icon: React.ReactNode;
  // duration weight (rough seconds), used to schedule visual completion
  weight: number;
}

const STAGES: Stage[] = [
  { key: "validate",  label: "Validating target & resolving origin",   icon: <Globe className="h-3.5 w-3.5" />,        weight: 0.3 },
  { key: "tls",       label: "Negotiating TLS · verifying cert chain", icon: <Lock className="h-3.5 w-3.5" />,         weight: 1.2 },
  { key: "headers",   label: "Fetching headers · CSP · HSTS · cookies", icon: <Server className="h-3.5 w-3.5" />,      weight: 1.5 },
  { key: "dns",       label: "DoH lookup · A · TXT · MX · CAA · DMARC", icon: <Network className="h-3.5 w-3.5" />,     weight: 1.0 },
  { key: "expose",    label: "Probing sensitive paths · open redirect", icon: <ShieldCheck className="h-3.5 w-3.5" />, weight: 1.5 },
  { key: "rep",       label: "Cross-checking IP against AbuseIPDB",     icon: <Database className="h-3.5 w-3.5" />,    weight: 0.8 },
  { key: "history",   label: "Querying NVD · HackerOne history",        icon: <Activity className="h-3.5 w-3.5" />,    weight: 1.0 },
  { key: "ai",        label: "Gemini synthesising attacker playbook",   icon: <Brain className="h-3.5 w-3.5" />,       weight: 2.5 },
];

export function LiveDashboard({ active }: { active: boolean }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [packets, setPackets] = useState<Array<{ id: number; lane: number; offset: number }>>([]);
  const counter = useRef(0);

  // Phase progression while active
  useEffect(() => {
    if (!active) {
      setCompleted(new Set());
      setCurrent(0);
      return;
    }
    let cancelled = false;
    let i = 0;
    setCompleted(new Set());
    setCurrent(0);
    function step() {
      if (cancelled || i >= STAGES.length) return;
      const s = STAGES[i];
      setCurrent(i);
      const ms = Math.max(450, s.weight * 900);
      setTimeout(() => {
        if (cancelled) return;
        setCompleted((prev) => new Set(prev).add(s.key));
        i += 1;
        if (i < STAGES.length) step();
      }, ms);
    }
    step();
    return () => { cancelled = true; };
  }, [active]);

  // Decorative packet stream
  useEffect(() => {
    if (!active) { setPackets([]); return; }
    const id = setInterval(() => {
      counter.current += 1;
      setPackets((prev) => {
        const next = [...prev, { id: counter.current, lane: Math.floor(Math.random() * 3), offset: 0 }];
        return next.slice(-12);
      });
    }, 280);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="border border-primary/25 bg-card rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border bg-primary/[0.04]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary">// Live Telemetry</div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          {completed.size}/{STAGES.length} stages
        </div>
      </div>

      {/* Packet lanes */}
      <div className="relative h-24 md:h-28 border-b border-border bg-background overflow-hidden">
        {[0, 1, 2].map((lane) => (
          <div key={lane} className="absolute left-0 right-0 h-px bg-border" style={{ top: `${25 + lane * 25}%` }} />
        ))}
        {packets.map((p) => (
          <div
            key={p.id}
            className="absolute h-1.5 w-6 bg-primary rounded-sm shadow-[0_0_12px_hsl(var(--primary))]"
            style={{
              top: `calc(${25 + p.lane * 25}% - 3px)`,
              left: 0,
              animation: "packet-fly 1.8s linear forwards",
            }}
          />
        ))}
        <style>{`@keyframes packet-fly{0%{left:-10%;opacity:0}10%{opacity:1}90%{opacity:1}100%{left:110%;opacity:0}}`}</style>
        <div className="absolute bottom-1 right-3 text-[9px] font-mono text-muted-foreground">
          tx {counter.current * 1234 % 99999} B/s
        </div>
      </div>

      {/* Stage list */}
      <div className="p-4 md:p-5 space-y-1.5">
        {STAGES.map((s, i) => {
          const isDone = completed.has(s.key);
          const isCurrent = i === current && !isDone;
          const isPending = i > current;
          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 text-xs md:text-sm py-1 transition-colors ${
                isDone ? "text-foreground" : isCurrent ? "text-primary" : "text-muted-foreground/60"
              }`}
            >
              <span className={`shrink-0 ${isCurrent ? "animate-pulse" : ""}`}>{s.icon}</span>
              <span className="flex-1 truncate">{s.label}</span>
              <span className="text-[10px] font-mono tabular-nums">
                {isDone ? "OK" : isCurrent ? "..." : isPending ? "—" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
