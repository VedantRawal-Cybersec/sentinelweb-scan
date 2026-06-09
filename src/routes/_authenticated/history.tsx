import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { listMyScans, deleteScan, getScanById, type ScanResult } from "@/lib/scanner.functions";
import { ScanResults } from "@/components/ScanResults";
import { useState } from "react";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Scan History — Sentinel AI" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const listFn = useServerFn(listMyScans);
  const getFn = useServerFn(getScanById);
  const delFn = useServerFn(deleteScan);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ScanResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: () => listFn(),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scans"] });
      setSelected(null);
      toast.success("Scan deleted");
    },
  });

  async function openScan(id: string) {
    try {
      const r = await getFn({ data: { id } });
      setSelected(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load scan");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-12 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">// Archive</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your scan history</h1>
          </div>

          {selected && (
            <div className="mb-10">
              <button
                onClick={() => setSelected(null)}
                className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4"
              >
                ← Back to list
              </button>
              <ScanResults result={selected} />
            </div>
          )}

          {!selected && (
            <>
              {isLoading && <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
              {!isLoading && (!data || data.length === 0) && (
                <div className="border border-dashed border-border p-12 rounded-md text-center">
                  <p className="text-muted-foreground mb-4">No scans yet.</p>
                  <Link to="/scan" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-sm text-xs uppercase tracking-widest font-bold hover:brightness-110 transition">
                    Run your first scan
                  </Link>
                </div>
              )}
              {data && data.length > 0 && (
                <div className="border border-border rounded-md divide-y divide-border bg-card">
                  {data.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition group">
                      <button onClick={() => openScan(s.id)} className="flex-1 text-left">
                        <div className="flex items-center gap-3">
                          <ScoreBadge score={s.score} />
                          <div className="min-w-0">
                            <div className="text-sm font-mono truncate">{s.hostname}</div>
                            <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openScan(s.id)} className="p-2 text-muted-foreground hover:text-foreground transition" aria-label="Open">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this scan?")) delMut.mutate(s.id); }} className="p-2 text-muted-foreground hover:text-destructive transition" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "bg-success/15 text-success border-success/30" : score >= 70 ? "bg-warning/15 text-warning border-warning/30" : "bg-critical/15 text-critical border-critical/30";
  return (
    <div className={`h-12 w-12 rounded-sm border flex items-center justify-center font-bold text-sm tabular-nums ${color}`}>
      {score}
    </div>
  );
}
