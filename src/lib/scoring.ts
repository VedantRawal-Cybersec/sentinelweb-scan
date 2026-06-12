// Transparent scoring algorithm. Pure functions, no I/O.

export type Severity = "critical" | "high" | "medium" | "low" | "info" | "pass";

export type ProofLevel =
  | "verified"
  | "high-confidence"
  | "potential"
  | "needs-review"
  | "encoded-safe"
  | "not-vulnerable";

export interface Proof {
  level: ProofLevel;
  label: string;
  score: number; // 0-100
  detectionMethod: string;
  module: string;
  testedUrl?: string;
  parameter?: string;
  context?: string;
  evidence: string[];
  confirmed: string[];
  notConfirmed: string[];
  missing: string[];
  toolsAgreed: number;
  reproduced: boolean;
  manualReviewRequired: boolean;
  outcome: string;
  detectedAt: string;
}

export interface Finding {
  id: string;
  category: "headers" | "tls" | "dns" | "reputation" | "exposure" | "cookies";
  title: string;
  severity: Severity;
  detail: string;
  penalty: number;
  recommendation?: string;
  proof?: Proof;
}

export const PROOF_LABEL: Record<ProofLevel, string> = {
  verified: "Verified Finding",
  "high-confidence": "High-Confidence Finding",
  potential: "Potential Risk",
  "needs-review": "Needs Manual Review",
  "encoded-safe": "Encoded — Not Exploitable",
  "not-vulnerable": "Not Vulnerable Under Current Scan",
};

export function proofLevelFromScore(score: number): ProofLevel {
  if (score >= 90) return "verified";
  if (score >= 70) return "high-confidence";
  if (score >= 40) return "potential";
  if (score >= 1) return "needs-review";
  return "not-vulnerable";
}

export interface ScoreBreakdown {
  total: number;
  byCategory: Record<Finding["category"], { score: number; penalty: number }>;
  grade: "A" | "B" | "C" | "D" | "F";
  label: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
}

export function gradeFor(score: number): ScoreBreakdown["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function labelFor(score: number): ScoreBreakdown["label"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
}

export function calculateScore(findings: Finding[]): ScoreBreakdown {
  const categories: Finding["category"][] = ["headers", "tls", "dns", "reputation", "exposure", "cookies"];
  const byCategory = Object.fromEntries(
    categories.map((c) => [c, { score: 100, penalty: 0 }]),
  ) as ScoreBreakdown["byCategory"];

  let totalPenalty = 0;
  for (const f of findings) {
    totalPenalty += f.penalty;
    byCategory[f.category].penalty += f.penalty;
  }
  for (const c of categories) {
    byCategory[c].score = Math.max(0, 100 - byCategory[c].penalty);
  }
  const total = Math.max(0, Math.min(100, 100 - totalPenalty));
  return { total, byCategory, grade: gradeFor(total), label: labelFor(total) };
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "text-critical",
  high: "text-critical",
  medium: "text-warning",
  low: "text-muted-foreground",
  info: "text-muted-foreground",
  pass: "text-success",
};
