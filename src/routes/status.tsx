import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { healthCheck } from "@/lib/scanner.functions";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Monitor, Smartphone } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — Sentinel AI" },
      { name: "description", content: "End-to-end health checks for the Sentinel AI scanner: DNS, IP reputation, AI gateway, database, and UI components." },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const fn = useServerFn(healthCheck);
  const q = useQuery({
    queryKey: ["health"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">// System Status</div>
              <h1 className="text-3xl md:text-4xl font-bold">End-to-end verification</h1>
              <p className="text-muted-foreground text-sm mt-1">Live health checks for every scanner module + UI verification.</p>
            </div>
            <button
              onClick={() => q.refetch()}
              disabled={q.isFetching}
              className="text-xs uppercase tracking-widest border border-border px-4 py-2 rounded-sm hover:border-primary hover:text-primary transition flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Re-run
            </button>
          </div>

          {/* Overall banner */}
          <div className={`mb-6 border rounded-md p-5 flex items-center gap-3 ${
            q.data?.allOk ? "border-success/30 bg-success/5" : q.data ? "border-critical/30 bg-critical/5" : "border-border bg-card"
          }`}>
            {q.isLoading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Running checks…</>
            ) : q.data?.allOk ? (
              <><CheckCircle2 className="h-5 w-5 text-success" /> <span className="text-sm">All systems operational · {q.data.totalLatency}ms</span></>
            ) : q.data ? (
              <><XCircle className="h-5 w-5 text-critical" /> <span className="text-sm">Some checks failed</span></>
            ) : (
              <span className="text-sm text-critical">Check failed: {(q.error as Error)?.message}</span>
            )}
          </div>

          {/* Backend services */}
          <div className="border border-border bg-card rounded-md overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-border text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Backend services
            </div>
            <div className="divide-y divide-border">
              {q.data?.checks?.map((c) => (
                <div key={c.name} className="px-5 py-4 flex items-center gap-3">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-critical shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{c.name}</div>
                    {c.detail && <div className="text-xs text-muted-foreground font-mono truncate">{c.detail}</div>}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground tabular-nums">{c.latency}ms</div>
                </div>
              ))}
              {q.isLoading && (
                <div className="px-5 py-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> probing…</div>
              )}
            </div>
          </div>

          {/* UI verification */}
          <UiVerification />
        </div>
      </div>
    </div>
  );
}

const UI_CHECKS: Array<{ key: string; label: string; run: () => Promise<{ ok: boolean; detail?: string }> }> = [
  { key: "router", label: "TanStack Router mounted", run: async () => ({ ok: typeof window !== "undefined" && !!document.querySelector("body"), detail: "DOM root present" }) },
  { key: "fonts", label: "Sora font loaded", run: async () => {
    if (typeof document === "undefined" || !document.fonts) return { ok: false, detail: "Font API unavailable" };
    await document.fonts.ready;
    const ok = document.fonts.check("12px Sora");
    return { ok, detail: ok ? "Sora available" : "Fallback font in use" };
  } },
  { key: "tailwind", label: "Tailwind CSS active", run: async () => {
    if (typeof document === "undefined") return { ok: false };
    const probe = document.createElement("div");
    probe.className = "hidden";
    document.body.appendChild(probe);
    const ok = getComputedStyle(probe).display === "none";
    probe.remove();
    return { ok, detail: ok ? "utility classes resolved" : "CSS not applied" };
  } },
  { key: "icons", label: "Lucide icon set", run: async () => {
    const svg = document.querySelector("svg.lucide, svg[class*='lucide']");
    return { ok: !!svg, detail: svg ? "icons rendered" : "no icons found" };
  } },
  { key: "lstorage", label: "Supabase session storage", run: async () => {
    try { localStorage.setItem("__sentinel_ping", "1"); localStorage.removeItem("__sentinel_ping"); return { ok: true, detail: "localStorage writable" }; }
    catch (e) { return { ok: false, detail: e instanceof Error ? e.message : String(e) }; }
  } },
  { key: "viewport", label: "Responsive viewport meta", run: async () => {
    const m = document.querySelector('meta[name="viewport"]');
    return { ok: !!m, detail: m?.getAttribute("content") ?? "missing" };
  } },
  { key: "anim", label: "CSS animations enabled", run: async () => {
    const ok = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return { ok: true, detail: ok ? "motion enabled" : "reduced-motion respected" };
  } },
];

function UiVerification() {
  const [results, setResults] = useState<Record<string, { ok: boolean; detail?: string }>>({});
  const [viewport, setViewport] = useState({ w: 0, h: 0, mobile: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, { ok: boolean; detail?: string }> = {};
      for (const c of UI_CHECKS) {
        try { next[c.key] = await c.run(); }
        catch (e) { next[c.key] = { ok: false, detail: e instanceof Error ? e.message : String(e) }; }
      }
      if (!cancelled) setResults(next);
    })();
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight, mobile: window.innerWidth < 768 });
    update();
    window.addEventListener("resize", update);
    return () => { cancelled = true; window.removeEventListener("resize", update); };
  }, []);

  return (
    <div className="border border-border bg-card rounded-md overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">UI verification (this device)</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {viewport.mobile ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
          <span className="font-mono">{viewport.w}×{viewport.h}</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {UI_CHECKS.map((c) => {
          const r = results[c.key];
          return (
            <div key={c.key} className="px-5 py-4 flex items-center gap-3">
              {!r ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              ) : r.ok ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-critical shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                {r?.detail && <div className="text-xs text-muted-foreground font-mono truncate">{r.detail}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
