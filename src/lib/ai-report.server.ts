// AI remediation report via Lovable AI Gateway (Gemini).
import type { Finding } from "./scoring";
import type { AiReport, HistoryItem } from "./scanner.functions";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callAi(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
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
  return data.choices?.[0]?.message?.content ?? "{}";
}

export async function generateAiReport(
  hostname: string,
  score: number,
  findings: Finding[],
): Promise<AiReport> {
  const failing = findings.filter((f) => f.severity !== "pass" && f.severity !== "info");

  const system = `You are a senior offensive-security consultant writing a deep, categorized assessment for engineers. Findings come from REAL live scans (HTTP headers, TLS, DNS, CORS, IP reputation, sensitive-file probing, mixed-content, open-redirect heuristics, robots.txt). Be highly specific to this domain. For every risk include: the attack vector, a realistic step-by-step exploitation walkthrough an attacker would take, the OWASP Top 10 (2021) category, a CWE id, and a CVSS-style severity. Output ONLY valid JSON matching the schema — no markdown.`;

  const user = `Domain: ${hostname}
Security score: ${score}/100
Findings (${failing.length} issues):

${failing.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.title} (category: ${f.category})\n   Detail: ${f.detail}\n   Suggested fix: ${f.recommendation ?? "—"}`).join("\n\n")}

Return JSON with this EXACT shape:
{
  "executiveSummary": "2-3 sentences tailored to ${hostname}",
  "topRisks": [
    {
      "title": "string",
      "severity": "Critical|High|Medium|Low",
      "cvss": "e.g. 7.5 (CVSS 3.1)",
      "owasp": "e.g. A05:2021 — Security Misconfiguration",
      "cwe": "e.g. CWE-693",
      "category": "Headers|TLS|DNS|Reputation|Exposure|Cookies|CORS|Email|Other",
      "impact": "business + security impact, 1-2 sentences",
      "attackVector": "1 sentence: how the attacker reaches this",
      "exploitationSteps": ["step 1", "step 2", "step 3"],
      "proofOfConcept": "short curl / payload / sample request demonstrating the attack",
      "remediation": "concrete fix",
      "codeExample": "config or code snippet implementing the fix",
      "estimatedEffort": "e.g. '15 minutes'",
      "references": ["url1", "url2"]
    }
  ],
  "categorizedFindings": {
    "Headers": ["short bullet"],
    "TLS": ["short bullet"],
    "DNS/Email": ["short bullet"],
    "Exposure": ["short bullet"],
    "Reputation": ["short bullet"]
  },
  "attackerNarrative": "3-5 sentences telling the story of how an attacker would chain the worst findings end-to-end against ${hostname}.",
  "roadmap": "Prioritized order of fixes, 2-3 sentences."
}

Focus on up to 8 top risks. If fewer real risks exist, return fewer.`;

  const content = await callAi(system, user);
  const parsed = JSON.parse(content) as Partial<AiReport>;
  return {
    executiveSummary: parsed.executiveSummary ?? "No summary generated.",
    topRisks: Array.isArray(parsed.topRisks) ? parsed.topRisks : [],
    categorizedFindings: parsed.categorizedFindings ?? {},
    attackerNarrative: parsed.attackerNarrative ?? "",
    roadmap: parsed.roadmap ?? "",
  };
}

export async function generateHistoryContext(
  hostname: string,
  nvd: HistoryItem[],
  hackerone: HistoryItem[],
): Promise<{ context: string; categorized: Record<string, string[]> }> {
  const system = `You are a security historian. Summarize publicly known historical vulnerabilities, breaches, and bug bounty findings for the given domain or its parent organization. Use ONLY widely public knowledge. If uncertain, say so. Categorize by attack class. Output ONLY valid JSON.`;

  const liveData = [
    nvd.length ? `Recent NVD matches:\n${nvd.slice(0, 5).map((n) => `- ${n.id} (${n.severity ?? "n/a"}): ${n.summary.slice(0, 160)}`).join("\n")}` : "No NVD matches found.",
    hackerone.length ? `HackerOne disclosed reports:\n${hackerone.slice(0, 5).map((h) => `- ${h.title} (${h.severity ?? "n/a"})`).join("\n")}` : "No HackerOne disclosed reports found.",
  ].join("\n\n");

  const user = `Domain: ${hostname}

${liveData}

Return JSON with this EXACT shape:
{
  "context": "3-5 sentences summarizing the public security history of ${hostname} and its parent organization. Mention notable past incidents, recurring weakness patterns, and what attackers have historically gone after. If little is publicly known, say that honestly.",
  "categorized": {
    "Injection (XSS / SQLi / SSRF)": ["short bullet on a real past finding if any, else omit key"],
    "Authentication & Session": ["..."],
    "Access Control / IDOR": ["..."],
    "Misconfiguration & Exposure": ["..."],
    "Cryptographic / TLS": ["..."],
    "Supply Chain / Dependencies": ["..."],
    "Information Disclosure": ["..."]
  }
}

Only include categories where you have a concrete bullet to report. Do not invent reports.`;

  const content = await callAi(system, user);
  const parsed = JSON.parse(content) as { context?: string; categorized?: Record<string, string[]> };
  return {
    context: parsed.context ?? "",
    categorized: parsed.categorized ?? {},
  };
}
