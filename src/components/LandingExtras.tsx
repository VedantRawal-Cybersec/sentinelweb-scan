import { useEffect, useRef, useState } from "react";
import { ShieldCheck, AlertTriangle, Lock, Wifi, Bug, Eye, Server, KeyRound } from "lucide-react";

/* ───────────────────────── Animated count-up ───────────────────────── */
export function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setV(Math.floor(eased * to));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}

/* ───────────────────────── Live threat ticker ───────────────────────── */
const TICKER = [
  { icon: ShieldCheck, t: "TLS 1.3 enforced on 1,284 hosts" },
  { icon: AlertTriangle, t: "Missing CSP detected on api.shop.io" },
  { icon: Bug, t: "Exposed .git directory on staging.demo.dev" },
  { icon: Lock, t: "HSTS preload verified on bank-portal.app" },
  { icon: Wifi, t: "Open port 27017 (MongoDB) on cache-04" },
  { icon: Eye, t: "Tracker leak via Referer on blog.acme.co" },
  { icon: Server, t: "X-Powered-By: PHP/5.6 — EOL stack" },
  { icon: KeyRound, t: "Weak DKIM (1024-bit) on mail.startup.io" },
];

export function ThreatTicker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative w-full overflow-hidden border-y border-border/40 bg-background/60 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max gap-10 py-3 animate-[ticker_45s_linear_infinite] motion-reduce:animate-none whitespace-nowrap">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <it.icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary/80">LIVE</span>
            <span className="text-foreground/80">{it.t}</span>
            <span className="text-primary">//</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

/* ───────────────────────── Scanner terminal preview ───────────────────────── */
const LINES = [
  { c: "primary", t: "$ sentinel scan https://target.app" },
  { c: "muted", t: "→ resolving DNS …" },
  { c: "muted", t: "→ probing TLS handshake (TLS 1.3, X25519)" },
  { c: "warning", t: "⚠  HSTS max-age below 6 months" },
  { c: "critical", t: "✖  Content-Security-Policy missing" },
  { c: "muted", t: "→ querying AbuseIPDB · 0 reports" },
  { c: "muted", t: "→ Gemini drafting remediation roadmap …" },
  { c: "success", t: "✓ scan complete · 9 findings · score 72/100" },
];

export function TerminalPreview() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x + 1) % (LINES.length + 4)), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative rounded-xl border border-border/60 bg-black/70 backdrop-blur shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.25)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-black/50">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        <span className="ml-2 text-[10px] font-mono text-muted-foreground tracking-widest">sentinel ~ live</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> SCANNING
        </span>
      </div>
      <pre className="font-mono text-[11px] sm:text-xs leading-relaxed p-4 min-h-[220px] whitespace-pre-wrap">
        {LINES.slice(0, Math.min(n, LINES.length)).map((l, i) => (
          <div key={i} className={
            l.c === "primary" ? "text-primary" :
            l.c === "warning" ? "text-[hsl(var(--warning))]" :
            l.c === "critical" ? "text-[hsl(var(--critical))]" :
            l.c === "success" ? "text-[hsl(var(--success))]" :
            "text-muted-foreground"
          }>{l.t}</div>
        ))}
        {n < LINES.length && <span className="inline-block w-2 h-3.5 bg-primary align-middle animate-pulse" />}
      </pre>
    </div>
  );
}

/* ───────────────────────── Magnetic glow card ───────────────────────── */
export function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={`group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm transition-all hover:border-primary/40 hover:-translate-y-0.5 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(400px circle at var(--mx,50%) var(--my,50%), hsl(var(--primary)/0.10), transparent 40%)",
      }}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── Meteor strip (light) ───────────────────────── */
export function Meteors({ count = 12 }: { count?: number }) {
  const meteors = Array.from({ length: count });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {meteors.map((_, i) => {
        const delay = (i * 0.7).toFixed(2);
        const dur = (6 + (i % 5)).toFixed(2);
        const left = ((i * 37) % 100).toFixed(0);
        return (
          <span
            key={i}
            className="absolute top-0 h-[2px] w-[2px] rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)] motion-reduce:hidden"
            style={{
              left: `${left}%`,
              animation: `meteor ${dur}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
      <style>{`@keyframes meteor{0%{transform:translate(0,-20vh) rotate(215deg);opacity:0}10%{opacity:1}100%{transform:translate(-60vw,120vh) rotate(215deg);opacity:0}}`}</style>
    </div>
  );
}
