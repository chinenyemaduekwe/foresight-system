export interface AccountSignals {
  lastLoginDays: number;
  lastReplyDays: number;
  openTickets: number;
  ticketSentiment: "positive" | "neutral" | "frustrated" | "angry";
  npsScore: number;
  usageTrend: "growing" | "stable" | "declining" | "dropped";
  notes: string;
}
export interface Account {
  id: string;
  name: string;
  industry: string;
  arr: number;
  daysToRenewal: number;
  champion: string;
  championStatus: "active" | "quiet" | "left";
  signals: AccountSignals;
}
export type RiskLevel = "healthy" | "monitor" | "atrisk" | "critical";
export interface RiskResult { score: number; level: RiskLevel; color: string; }
export const accounts: any[];
export const mockAccounts: Account[];
export function scoreAccount(account: Account): RiskResult;
