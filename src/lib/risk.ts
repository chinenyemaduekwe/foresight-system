import type { Account, AccountSignals, RiskLevel } from "@/data/mockData";

export type RiskTone = "critical" | "atrisk" | "monitor" | "healthy" | "avg";

export const toneStyles: Record<RiskTone, { bg: string; fg: string; bar: string; ring: string }> = {
  critical: { bg: "bg-risk-critical/10", fg: "text-risk-critical", bar: "bg-risk-critical", ring: "ring-risk-critical/30" },
  atrisk:   { bg: "bg-risk-atrisk/10",   fg: "text-risk-atrisk",   bar: "bg-risk-atrisk",   ring: "ring-risk-atrisk/30" },
  monitor:  { bg: "bg-risk-monitor/10",  fg: "text-risk-monitor",  bar: "bg-risk-monitor",  ring: "ring-risk-monitor/30" },
  healthy:  { bg: "bg-risk-healthy/10",  fg: "text-risk-healthy",  bar: "bg-risk-healthy",  ring: "ring-risk-healthy/30" },
  avg:      { bg: "bg-risk-avg/10",      fg: "text-risk-avg",      bar: "bg-risk-avg",      ring: "ring-risk-avg/30" },
};

export const levelLabel: Record<RiskLevel, string> = {
  critical: "Critical",
  atrisk: "At risk",
  monitor: "Monitor",
  healthy: "Healthy",
};

export const levelRank: Record<RiskLevel, number> = { critical: 4, atrisk: 3, monitor: 2, healthy: 1 };

export type ScoredAccount = Account & {
  score: number;
  level: RiskLevel;
  color: string;
  prior: number;
  trend: "up" | "down" | "flat";
};

export function priorScore(id: string, current: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const delta = (Math.abs(h) % 21) - 10;
  return Math.max(0, Math.min(100, current - delta));
}

export function trendOf(current: number, prior: number): "up" | "down" | "flat" {
  const d = current - prior;
  if (d >= 4) return "up";
  if (d <= -4) return "down";
  return "flat";
}

/** Deterministic 4-week history ending at current score. */
export function scoreHistory(id: string, current: number): { week: string; score: number }[] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) | 0;
  const rand = (n: number) => {
    h = (h ^ (h << 13)) | 0;
    h = (h ^ (h >>> 17)) | 0;
    h = (h ^ (h << 5)) | 0;
    return Math.abs(h) % n;
  };
  const labels = ["Wk -3", "Wk -2", "Wk -1", "Now"];
  const prior = priorScore(id, current);
  // interpolate between prior and current with small jitter
  const pts = [0, 1, 2, 3].map((i) => {
    const t = i / 3;
    const base = prior + (current - prior) * t;
    const jitter = rand(7) - 3;
    const v = Math.max(0, Math.min(100, Math.round(base + (i === 3 ? 0 : jitter))));
    return { week: labels[i], score: v };
  });
  pts[3].score = current;
  return pts;
}

export const signalLabels = ["Last login", "Last reply", "Open tickets", "Sentiment", "NPS", "Usage trend"];

export function signalTones(s: AccountSignals): RiskTone[] {
  const login: RiskTone =
    s.lastLoginDays > 30 ? "critical" : s.lastLoginDays > 14 ? "atrisk" : s.lastLoginDays > 7 ? "monitor" : "healthy";
  const reply: RiskTone =
    s.lastReplyDays > 30 ? "critical" : s.lastReplyDays > 14 ? "atrisk" : s.lastReplyDays > 7 ? "monitor" : "healthy";
  const tickets: RiskTone =
    s.openTickets >= 5 ? "critical" : s.openTickets >= 3 ? "atrisk" : s.openTickets >= 1 ? "monitor" : "healthy";
  const sentiment: RiskTone =
    s.ticketSentiment === "angry" ? "critical"
      : s.ticketSentiment === "frustrated" ? "atrisk"
      : s.ticketSentiment === "neutral" ? "monitor" : "healthy";
  const nps: RiskTone =
    s.npsScore <= 3 ? "critical" : s.npsScore <= 6 ? "atrisk" : s.npsScore <= 7 ? "monitor" : "healthy";
  const usage: RiskTone =
    s.usageTrend === "dropped" ? "critical"
      : s.usageTrend === "declining" ? "atrisk"
      : s.usageTrend === "stable" ? "monitor" : "healthy";
  return [login, reply, tickets, sentiment, nps, usage];
}

export function championTone(status: Account["championStatus"]): RiskTone {
  return status === "active" ? "healthy" : status === "quiet" ? "atrisk" : "critical";
}

export function formatArr(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n}`;
}

export function signalNote(kind: "login" | "reply" | "tickets" | "sentiment" | "nps" | "usage" | "champion", v: AccountSignals | Account["championStatus"]): string {
  if (kind === "champion") {
    const s = v as Account["championStatus"];
    return s === "active" ? "Engaged" : s === "quiet" ? "Going silent" : "Departed";
  }
  const s = v as AccountSignals;
  switch (kind) {
    case "login": return s.lastLoginDays > 30 ? "Dormant" : s.lastLoginDays > 14 ? "Slipping" : s.lastLoginDays > 7 ? "Slowing" : "Active";
    case "reply": return s.lastReplyDays > 30 ? "Unresponsive" : s.lastReplyDays > 14 ? "Delayed" : s.lastReplyDays > 7 ? "Lagging" : "Responsive";
    case "tickets": return s.openTickets >= 5 ? "Overloaded" : s.openTickets >= 3 ? "Elevated" : s.openTickets >= 1 ? "Normal" : "Quiet";
    case "sentiment": return s.ticketSentiment === "angry" ? "Hostile" : s.ticketSentiment === "frustrated" ? "Tense" : s.ticketSentiment === "neutral" ? "Flat" : "Warm";
    case "nps": return s.npsScore <= 3 ? "Detractor" : s.npsScore <= 6 ? "At risk" : s.npsScore <= 7 ? "Passive" : "Promoter";
    case "usage": return s.usageTrend === "dropped" ? "Off platform" : s.usageTrend === "declining" ? "Falling" : s.usageTrend === "stable" ? "Holding" : "Growing";
  }
}