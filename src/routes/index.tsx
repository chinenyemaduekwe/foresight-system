import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { scoreAccount } from "@/data/mockData";
import type { Account, AccountSignals } from "@/data/mockData";
import { useAccounts } from "@/hooks/use-accounts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Gauge, Heart, Minus, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Foresight" },
      { name: "description", content: "Health overview across your customer portfolio." },
    ],
  }),
  component: Index,
});

type RiskTone = "critical" | "atrisk" | "monitor" | "healthy" | "avg";

const toneStyles: Record<RiskTone, { bg: string; fg: string; ring: string; bar: string }> = {
  critical: { bg: "bg-risk-critical/10", fg: "text-risk-critical", ring: "ring-risk-critical/20", bar: "bg-risk-critical" },
  atrisk:   { bg: "bg-risk-atrisk/10",   fg: "text-risk-atrisk",   ring: "ring-risk-atrisk/20",   bar: "bg-risk-atrisk" },
  monitor:  { bg: "bg-risk-monitor/10",  fg: "text-risk-monitor",  ring: "ring-risk-monitor/20",  bar: "bg-risk-monitor" },
  healthy:  { bg: "bg-risk-healthy/10",  fg: "text-risk-healthy",  ring: "ring-risk-healthy/20",  bar: "bg-risk-healthy" },
  avg:      { bg: "bg-risk-avg/10",      fg: "text-risk-avg",      ring: "ring-risk-avg/20",      bar: "bg-risk-avg" },
};

const levelLabel: Record<"critical" | "atrisk" | "monitor" | "healthy", string> = {
  critical: "Critical",
  atrisk: "At risk",
  monitor: "Monitor",
  healthy: "Healthy",
};

// Deterministic prior score from id, used to derive trend without true history.
function priorScore(id: string, current: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const delta = (Math.abs(h) % 21) - 10; // -10..+10
  return Math.max(0, Math.min(100, current - delta));
}

function trendOf(current: number, prior: number): "up" | "down" | "flat" {
  const d = current - prior;
  if (d >= 4) return "up";
  if (d <= -4) return "down";
  return "flat";
}

// Each signal → tone (healthy/monitor/atrisk/critical)
function signalTones(s: AccountSignals): RiskTone[] {
  const login: RiskTone =
    s.lastLoginDays > 30 ? "critical" : s.lastLoginDays > 14 ? "atrisk" : s.lastLoginDays > 7 ? "monitor" : "healthy";
  const reply: RiskTone =
    s.lastReplyDays > 30 ? "critical" : s.lastReplyDays > 14 ? "atrisk" : s.lastReplyDays > 7 ? "monitor" : "healthy";
  const tickets: RiskTone =
    s.openTickets >= 5 ? "critical" : s.openTickets >= 3 ? "atrisk" : s.openTickets >= 1 ? "monitor" : "healthy";
  const sentiment: RiskTone =
    s.ticketSentiment === "angry"
      ? "critical"
      : s.ticketSentiment === "frustrated"
        ? "atrisk"
        : s.ticketSentiment === "neutral"
          ? "monitor"
          : "healthy";
  const nps: RiskTone =
    s.npsScore <= 3 ? "critical" : s.npsScore <= 6 ? "atrisk" : s.npsScore <= 7 ? "monitor" : "healthy";
  const usage: RiskTone =
    s.usageTrend === "dropped"
      ? "critical"
      : s.usageTrend === "declining"
        ? "atrisk"
        : s.usageTrend === "stable"
          ? "monitor"
          : "healthy";
  return [login, reply, tickets, sentiment, nps, usage];
}

const signalLabels = ["Last login", "Last reply", "Open tickets", "Sentiment", "NPS", "Usage trend"];

function SignalDots({ signals }: { signals: AccountSignals }) {
  const tones = signalTones(signals);
  return (
    <div className="flex items-center gap-1.5">
      {tones.map((t, i) => (
        <span
          key={i}
          title={`${signalLabels[i]}: ${t}`}
          className={`h-2.5 w-2.5 rounded-full ${toneStyles[t].bar}`}
        />
      ))}
    </div>
  );
}

function TrendArrow({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up")
    return (
      <span className="inline-flex items-center gap-1 text-risk-critical">
        <ArrowUpRight className="h-4 w-4" />
        <span className="text-xs font-medium">Worsening</span>
      </span>
    );
  if (dir === "down")
    return (
      <span className="inline-flex items-center gap-1 text-risk-healthy">
        <ArrowDownRight className="h-4 w-4" />
        <span className="text-xs font-medium">Improving</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      <span className="text-xs font-medium">Steady</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  tone,
  icon: Icon,
  className,
  style,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone: RiskTone;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = toneStyles[tone];
  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {sublabel ? <p className="text-xs text-muted-foreground">{sublabel}</p> : null}
        </div>
        <div className={`rounded-md p-2 ring-1 ${t.bg} ${t.fg} ${t.ring}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function Index() {
  const navigate = useNavigate();
  const { data: accounts, isLoading, error } = useAccounts();

  const scored = (accounts ?? []).map((a: Account) => {
    const r = scoreAccount(a);
    const prior = priorScore(a.id, r.score);
    return { ...a, ...r, prior, trend: trendOf(r.score, prior) };
  });

  const critical = scored.filter((a) => a.level === "critical").length;
  const atRisk = scored.filter((a) => a.level === "atrisk").length;
  const healthy = scored.filter((a) => a.level === "healthy").length;
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + a.score, 0) / scored.length)
    : 0;

  const priority = [...scored].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        meta={
          isLoading
            ? "Loading portfolio health…"
            : error
              ? "Failed to load accounts."
              : `Portfolio health across ${scored.length} accounts`
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Critical accounts"
          value={critical}
          sublabel="Score ≥ 70"
          tone="critical"
          icon={ShieldAlert}
          className="animate-fade-up"
          style={{ animationDelay: "0ms" }}
        />
        <StatCard
          label="At-risk accounts"
          value={atRisk}
          sublabel="Score 45–69"
          tone="atrisk"
          icon={AlertTriangle}
          className="animate-fade-up"
          style={{ animationDelay: "60ms" }}
        />
        <StatCard
          label="Average risk score"
          value={avgScore}
          sublabel="Across portfolio"
          tone="avg"
          icon={Gauge}
          className="animate-fade-up"
          style={{ animationDelay: "120ms" }}
        />
        <StatCard
          label="Healthy accounts"
          value={healthy}
          sublabel="Score < 25"
          tone="healthy"
          icon={Heart}
          className="animate-fade-up"
          style={{ animationDelay: "180ms" }}
        />
      </div>

      <Card className="animate-fade-up overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="serif text-xl tracking-tight">Priority queue</h2>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Top 10 accounts by risk score</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[24%]">Account</TableHead>
              <TableHead className="w-[14%]">Industry</TableHead>
              <TableHead className="w-[18%]">Risk score</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[14%]">Signals</TableHead>
              <TableHead className="w-[10%]">Trend</TableHead>
              <TableHead className="w-[10%] text-right">Renewal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priority.map((a, idx) => {
              const tone = a.level as RiskTone;
              const t = toneStyles[tone];
              return (
                <TableRow
                  key={a.id}
                  onClick={() => navigate({ to: "/accounts" })}
                  className="animate-fade-up cursor-pointer transition-colors"
                  style={{ animationDelay: `${idx * 25}ms` }}
                >
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    <div className="mono text-[10px] text-muted-foreground">{a.id}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.industry}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`animate-bar h-full ${t.bar}`}
                          style={{ width: `${a.score}%`, transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{a.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-transparent font-medium ${t.bg} ${t.fg}`}
                    >
                      {levelLabel[a.level]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SignalDots signals={a.signals} />
                  </TableCell>
                  <TableCell>
                    <TrendArrow dir={a.trend} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {a.daysToRenewal}d
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && priority.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No accounts yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
