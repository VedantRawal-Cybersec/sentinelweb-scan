// Domain history: NVD CVE lookup + (best-effort) HackerOne disclosed reports.
// Pure server. No secrets required for NVD (rate-limited without API key, which is fine).

export interface HistoryItem {
  source: "NVD" | "HackerOne" | "AI";
  id: string;
  title: string;
  severity?: string;
  publishedAt?: string;
  url?: string;
  summary: string;
}

const NVD_TIMEOUT = 6000;

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = NVD_TIMEOUT) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

// Strip subdomains down to registered domain (best-effort).
function rootDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

export async function fetchNvdHistory(hostname: string): Promise<HistoryItem[]> {
  const keyword = rootDomain(hostname).split(".")[0];
  if (!keyword || keyword.length < 3) return [];
  try {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=8`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      vulnerabilities?: Array<{
        cve: {
          id: string;
          published?: string;
          descriptions?: Array<{ lang: string; value: string }>;
          metrics?: {
            cvssMetricV31?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }>;
            cvssMetricV30?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }>;
          };
        };
      }>;
    };
    const items = (json.vulnerabilities ?? []).slice(0, 8).map((v): HistoryItem => {
      const c = v.cve;
      const desc = c.descriptions?.find((d) => d.lang === "en")?.value ?? "";
      const m = c.metrics?.cvssMetricV31?.[0] ?? c.metrics?.cvssMetricV30?.[0];
      const sev = m ? `${m.cvssData.baseSeverity} (${m.cvssData.baseScore})` : undefined;
      return {
        source: "NVD",
        id: c.id,
        title: c.id,
        severity: sev,
        publishedAt: c.published,
        url: `https://nvd.nist.gov/vuln/detail/${c.id}`,
        summary: desc.slice(0, 320),
      };
    });
    return items;
  } catch {
    return [];
  }
}

export async function fetchHackerOneHistory(hostname: string): Promise<HistoryItem[]> {
  // HackerOne has no public REST search without auth. Best-effort: try the public
  // hacktivity GraphQL endpoint; if blocked, return [].
  const root = rootDomain(hostname);
  try {
    const body = {
      operationName: "HacktivitySearch",
      variables: {
        query: { query_string: { query: root } },
        size: 5,
        from: 0,
      },
      query:
        "query HacktivitySearch($query: SearchQuery!, $from: Int, $size: Int) { search(index: hacktivity_items, query_string: $query, from: $from, size: $size) { nodes { ... on HacktivityDocument { id url title substate severity_rating disclosed_at reporter { username } team { handle } } } } }",
    };
    const res = await fetchWithTimeout("https://hackerone.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }, 5000);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { search?: { nodes?: Array<{ id: string; url?: string; title?: string; severity_rating?: string; disclosed_at?: string }> } };
    };
    const nodes = json.data?.search?.nodes ?? [];
    return nodes.slice(0, 5).map((n): HistoryItem => ({
      source: "HackerOne",
      id: n.id,
      title: n.title ?? "Disclosed report",
      severity: n.severity_rating,
      publishedAt: n.disclosed_at,
      url: n.url ? `https://hackerone.com${n.url}` : undefined,
      summary: n.title ?? "",
    }));
  } catch {
    return [];
  }
}
