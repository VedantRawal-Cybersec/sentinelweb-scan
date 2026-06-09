// AI remediation report via Lovable AI Gateway (Gemini).
import type { Finding } from "./scoring";
import type { AiReport } from "./scanner.functions";

export async function generateAiReport(
  hostname: string,
  score: number,
  findings: Finding[],
): Promise<AiReport> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const failing = findings.filter((f) => f.severity !== "pass" && f.severity !== "info");

  const system = `You are a senior application security consultant. The findings below come from REAL live scans (HTTP headers, TLS, DNS, IP reputation, robots.txt). Be specific to this domain. Give actionable remediation with code/config snippets. Avoid generic boilerplate. Output ONLY valid JSON matching the schema — no markdown, no prose around it.`;

  const user = `Domain: ${hostname}
Security score: ${score}/100
Findings (${failing.length} issues):

${failing.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.title} (category: ${f.category})\n   Detail: ${f.detail}\n   Recommendation: ${f.recommendation ?? "—"}`).join("\n\n")}

Return JSON with shape:
{
  "executiveSummary": "string, 2-3 sentences tailored to this domain",
  "topRisks": [
    {
      "title": "string",
      "severity": "Critical|High|Medium|Low",
      "impact": "string — business/security impact",
      "remediation": "string — concrete steps",
      "estimatedEffort": "e.g. '15 minutes' or '2 hours'",
      "codeExample": "optional config or code snippet"
    }
  ],
  "roadmap": "string — prioritized order of fixes, 1-2 sentences"
}

Focus on the top 5 risks. If there are fewer than 5 real risks, return fewer.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit exceeded — try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted — please top up Lovable AI credits.");
  if (!res.ok) throw new Error(`AI gateway error: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "{}";

  const parsed = JSON.parse(content) as Partial<AiReport>;
  return {
    executiveSummary: parsed.executiveSummary ?? "No summary generated.",
    topRisks: Array.isArray(parsed.topRisks) ? parsed.topRisks : [],
    roadmap: parsed.roadmap ?? "",
  };
}
