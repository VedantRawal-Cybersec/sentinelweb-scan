import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateScanUrl } from "./url-validation";
import { calculateScore, type Finding, type ScoreBreakdown } from "./scoring";

export interface ScanResult {
  id?: string;
  url: string;
  hostname: string;
  score: ScoreBreakdown;
  findings: Finding[];
  aiReport?: AiReport | null;
  history?: HistoryBundle | null;
  createdAt: string;
}

export interface HistoryItem {
  source: "NVD" | "HackerOne" | "AI";
  id: string;
  title: string;
  severity?: string;
  publishedAt?: string;
  url?: string;
  summary: string;
}

export interface HistoryBundle {
  nvd: HistoryItem[];
  hackerone: HistoryItem[];
  aiContext: string;
  categorized: Record<string, string[]>;
}

export interface AiReport {
  executiveSummary: string;
  topRisks: Array<{
    title: string;
    severity: string;
    cvss?: string;
    owasp?: string;
    cwe?: string;
    category?: string;
    impact: string;
    attackVector?: string;
    exploitationSteps?: string[];
    proofOfConcept?: string;
    remediation: string;
    estimatedEffort: string;
    codeExample?: string;
    references?: string[];
  }>;
  categorizedFindings?: Record<string, string[]>;
  attackerNarrative?: string;
  roadmap: string;
}

// PUBLIC scan — no auth required, doesn't persist
export const runPublicScan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const v = input as { url?: string };
    if (!v?.url) throw new Error("URL required");
    return { url: v.url };
  })
  .handler(async ({ data }): Promise<ScanResult> => {
    const v = validateScanUrl(data.url);
    if (!v.ok) throw new Error(v.error);

    const { runScan } = await import("./scanner.server");
    const { attachProofs } = await import("./proof");
    const rawFindings = await runScan(v.url, v.hostname);
    const findings = attachProofs(rawFindings, { url: v.url, hostname: v.hostname });
    const score = calculateScore(findings);

    return {
      url: v.url,
      hostname: v.hostname,
      score,
      findings,
      createdAt: new Date().toISOString(),
    };
  });


// AUTHENTICATED scan — saves to user history and runs AI report + history lookup
export const runScanAndSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { url?: string };
    if (!v?.url) throw new Error("URL required");
    return { url: v.url };
  })
  .handler(async ({ data, context }): Promise<ScanResult> => {
    const v = validateScanUrl(data.url);
    if (!v.ok) throw new Error(v.error);

    const { runScan } = await import("./scanner.server");
    const findings = await runScan(v.url, v.hostname);
    const score = calculateScore(findings);

    // Run AI report + history lookups in parallel
    const [aiReport, history] = await Promise.all([
      (async () => {
        try {
          const { generateAiReport } = await import("./ai-report.server");
          return await generateAiReport(v.hostname, score.total, findings);
        } catch (e) {
          console.error("AI report failed:", e);
          return null;
        }
      })(),
      (async () => {
        try {
          const { fetchNvdHistory, fetchHackerOneHistory } = await import("./history.server");
          const [nvd, hackerone] = await Promise.all([
            fetchNvdHistory(v.hostname),
            fetchHackerOneHistory(v.hostname),
          ]);
          let aiContext = "";
          let categorized: Record<string, string[]> = {};
          try {
            const { generateHistoryContext } = await import("./ai-report.server");
            const aiOut = await generateHistoryContext(v.hostname, nvd, hackerone);
            aiContext = aiOut.context;
            categorized = aiOut.categorized;
          } catch (e) {
            console.error("AI history context failed:", e);
          }
          return { nvd, hackerone, aiContext, categorized };
        } catch (e) {
          console.error("History lookup failed:", e);
          return null;
        }
      })(),
    ]);

    const { data: inserted, error } = await context.supabase
      .from("scans")
      .insert({
        user_id: context.userId,
        url: v.url,
        hostname: v.hostname,
        score: score.total,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        findings: findings as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ai_report: { report: aiReport, history } as any,
      })
      .select("id, created_at")
      .single();
    if (error) throw error;

    return {
      id: inserted.id,
      url: v.url,
      hostname: v.hostname,
      score,
      findings,
      aiReport,
      history,
      createdAt: inserted.created_at,
    };
  });

export const listMyScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scans")
      .select("id, url, hostname, score, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const getScanById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { id?: string };
    if (!v?.id) throw new Error("id required");
    return { id: v.id };
  })
  .handler(async ({ data, context }): Promise<ScanResult> => {
    const { data: row, error } = await context.supabase
      .from("scans")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Scan not found");
    const findings = (row.findings ?? []) as unknown as Finding[];
    // Backwards compat: old rows stored AiReport directly; new rows store { report, history }.
    const rawAi = row.ai_report as unknown as
      | AiReport
      | { report?: AiReport | null; history?: HistoryBundle | null }
      | null;
    let aiReport: AiReport | null = null;
    let history: HistoryBundle | null = null;
    if (rawAi && typeof rawAi === "object") {
      if ("report" in rawAi || "history" in rawAi) {
        aiReport = (rawAi as { report?: AiReport | null }).report ?? null;
        history = (rawAi as { history?: HistoryBundle | null }).history ?? null;
      } else {
        aiReport = rawAi as AiReport;
      }
    }
    return {
      id: row.id,
      url: row.url,
      hostname: row.hostname,
      score: calculateScore(findings),
      findings,
      aiReport,
      history,
      createdAt: row.created_at,
    };
  });

export const deleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { id?: string };
    if (!v?.id) throw new Error("id required");
    return { id: v.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scans").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// PUBLIC health check for /status page
export const healthCheck = createServerFn({ method: "GET" })
  .handler(async () => {
    const start = Date.now();
    const checks: Array<{ name: string; ok: boolean; latency: number; detail?: string }> = [];

    async function probe(name: string, fn: () => Promise<{ ok: boolean; detail?: string }>) {
      const s = Date.now();
      try {
        const r = await fn();
        checks.push({ name, ok: r.ok, latency: Date.now() - s, detail: r.detail });
      } catch (e) {
        checks.push({ name, ok: false, latency: Date.now() - s, detail: e instanceof Error ? e.message : String(e) });
      }
    }

    await Promise.all([
      probe("Cloudflare DoH (DNS)", async () => {
        const r = await fetch("https://cloudflare-dns.com/dns-query?name=example.com&type=A", { headers: { Accept: "application/dns-json" } });
        return { ok: r.ok, detail: `HTTP ${r.status}` };
      }),
      probe("AbuseIPDB (IP reputation)", async () => {
        const key = process.env.ABUSEIPDB_API_KEY;
        if (!key) return { ok: false, detail: "API key not configured" };
        const r = await fetch("https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8&maxAgeInDays=90", { headers: { Key: key, Accept: "application/json" } });
        return { ok: r.ok, detail: `HTTP ${r.status}` };
      }),
      probe("NVD (CVE database)", async () => {
        const r = await fetch("https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1");
        return { ok: r.ok, detail: `HTTP ${r.status}` };
      }),
      probe("Lovable AI Gateway", async () => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return { ok: false, detail: "API key not configured" };
        // OPTIONS-style probe via tiny chat call
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
        });
        return { ok: r.ok || r.status === 429, detail: `HTTP ${r.status}` };
      }),
      probe("Supabase (database)", async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return { ok: false, detail: "Not configured" };
        const r = await fetch(`${url}/rest/v1/`, { headers: { apikey: key } });
        return { ok: r.ok, detail: `HTTP ${r.status}` };
      }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      totalLatency: Date.now() - start,
      checks,
      allOk: checks.every((c) => c.ok),
    };
  });
