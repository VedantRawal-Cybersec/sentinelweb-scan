import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { ScanResults } from "@/components/ScanResults";
import { runScanAndSave, type ScanResult } from "@/lib/scanner.functions";
import { validateScanUrl } from "@/lib/url-validation";
import { toast } from "sonner";
import { Search, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Run a Scan — Sentinel AI" },
      { name: "description", content: "Run a real security assessment on any website with AI-driven remediation." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const scanFn = useServerFn(runScanAndSave);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (rawUrl: string) => scanFn({ data: { url: rawUrl } }),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Scan complete · ${data.score.total}/100`);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    },
  });

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const v = validateScanUrl(url);
    if (!v.ok) { toast.error(v.error); return; }
    mutation.mutate(v.url);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-28 pb-12 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">// Security Console</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Run a real assessment</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Enter any public URL. Sentinel inspects TLS, headers, DNS, IP reputation and asks Gemini to write a remediation plan.
            </p>
          </div>

          <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-2 mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-card border border-border rounded-sm pl-11 pr-4 py-4 text-sm focus:outline-none focus:border-primary transition font-mono"
                autoFocus
                disabled={mutation.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending || !url.trim()}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-sm text-xs uppercase tracking-widest font-bold hover:brightness-110 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 min-w-[160px]"
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Scanning</>
              ) : (
                <>Run Scan <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {mutation.isPending && <ScanningSkeleton />}

          {result && !mutation.isPending && (
            <ScanResults result={result} />
          )}

          {!result && !mutation.isPending && <EmptyState onPickDemo={(d) => { setUrl(d); router.invalidate(); }} />}
        </div>
      </div>
    </div>
  );
}

function ScanningSkeleton() {
  const steps = ["Validating URL", "Inspecting TLS & headers", "Resolving DNS & email posture", "Checking IP reputation", "Asking Gemini for remediation"];
  return (
    <div className="border border-border bg-card p-8 rounded-md">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="text-sm font-semibold uppercase tracking-widest">Live Scan in Progress</div>
      </div>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onPickDemo }: { onPickDemo: (url: string) => void }) {
  const demos = ["https://github.com", "https://news.ycombinator.com", "https://example.com"];
  return (
    <div className="border border-dashed border-border p-12 rounded-md text-center">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Try a real domain</div>
      <div className="flex flex-wrap justify-center gap-2">
        {demos.map((d) => (
          <button
            key={d}
            onClick={() => onPickDemo(d)}
            className="font-mono text-xs px-4 py-2 rounded-sm border border-border hover:border-primary hover:text-primary transition"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
