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
  createdAt: string;
}

export interface AiReport {
  executiveSummary: string;
  topRisks: Array<{
    title: string;
    severity: string;
    impact: string;
    remediation: string;
    estimatedEffort: string;
    codeExample?: string;
  }>;
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
    const findings = await runScan(v.url, v.hostname);
    const score = calculateScore(findings);

    return {
      url: v.url,
      hostname: v.hostname,
      score,
      findings,
      createdAt: new Date().toISOString(),
    };
  });

// AUTHENTICATED scan — saves to user history and runs AI report
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

    let aiReport: AiReport | null = null;
    try {
      const { generateAiReport } = await import("./ai-report.server");
      aiReport = await generateAiReport(v.hostname, score.total, findings);
    } catch (e) {
      console.error("AI report failed:", e);
    }

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
        ai_report: aiReport as any,
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
    return {
      id: row.id,
      url: row.url,
      hostname: row.hostname,
      score: calculateScore(findings),
      findings,
      aiReport: (row.ai_report as unknown as AiReport) ?? null,
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
