import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  DollarSign,
  Inbox,
  Loader2,
  Search,
  Sparkles,
  TrendingDown,
} from "lucide-react";

import { accounts as rawAccounts } from "@/data/mockData";
import { analyzeAccount, type AnalysisResult } from "@/lib/analyze-account.functions";
import { AccountDetailPanel } from "@/components/account-detail-panel";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import type { Account, AccountSignals } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/signals")({
  head: () => ({
    meta: [
      { title: "Signal Log — Foresight" },
      { name: "description", content: "Weekly customer signal review." },
    ],
  }),
  component: SignalLogPage,
});

// ---------- types & helpers ----------

type RawSignals = {
  last_login_days: number;
  last_reply_days: number;
  ticket_count_30d: number;
  critical_ticket_count: number;
  ticket_sentiment: "positive" | "neutral" | "frustrated" | "angry";
  nps_score: number;
  usage_trend: "growing" | "stable" | "declining" | "dropped";
  meeting_attendance_rate_pct: number;
  goal_progress_pct: number;
  payment_status: "Current" | "Overdue";
};

type RawAccount = {
  id: string;
  name: string;
  industry: string;
  segment: string;
  arr: number;
  days_to_renewal: number;
  champion: string;
  champion_status: "active" | "quiet" | "left";
  primary_goal: string;
  risk_level: "Critical" | "At Risk" | "Monitor" | "Healthy";
  churn_probability_pct: number;
  arr_at_risk: number;
  top_risk_drivers: string[];
  signals: RawSignals;
  notes?: string;
};

const ALL: RawAccount[] = rawAccounts as unknown as RawAccount[];

type Tone = "green" | "amber" | "red";

const toneClass: Record<Tone, string> = {
  green: "text-risk-healthy",
  amber: "text-risk-atrisk",
  red: "text-risk-critical",
};
const toneDot: Record<Tone, string> = {
  green: "bg-risk-healthy",
  amber: "bg-risk-atrisk",
  red: "bg-risk-critical",
};

function daysTone(d: number): Tone {
  if (d <= 3) return "green";
  if (d <= 14) return "amber";
  return "red";
}
function ticketsTone(n: number): Tone {
  if (n <= 1) return "green";
  if (n <= 4) return "amber";
  return "red";
}
function critTicketsTone(n: number): Tone {
  return n === 0 ? "green" : "red";
}
function npsTone(n: number): Tone {
  if (n >= 8) return "green";
  if (n >= 6) return "amber";
  return "red";
}
function usageTone(u: RawSignals["usage_trend"]): Tone {
  if (u === "growing") return "green";
  if (u === "stable") return "amber";
  return "red";
}
function meetingTone(p: number): Tone {
  if (p >= 75) return "green";
  if (p >= 50) return "amber";
  return "red";
}
function renewalTone(d: number): Tone {
  if (d > 60) return "green";
  if (d > 30) return "amber";
  return "red";
}

type LevelKey = "Critical" | "At Risk" | "Monitor" | "Healthy";
const levelOrder: Record<LevelKey, number> = {
  Critical: 4,
  "At Risk": 3,
  Monitor: 2,
  Healthy: 1,
};
const levelStyles: Record<
  LevelKey,
  { badge: string; border: string; bgTint: string }
> = {
  Critical: {
    badge: "bg-risk-critical/10 text-risk-critical",
    border: "border-l-risk-critical",
    bgTint: "bg-risk-critical/[0.03]",
  },
  "At Risk": {
    badge: "bg-risk-atrisk/10 text-risk-atrisk",
    border: "border-l-risk-atrisk",
    bgTint: "",
  },
  Monitor: {
    badge: "bg-risk-monitor/10 text-risk-monitor",
    border: "border-l-risk-monitor",
    bgTint: "",
  },
  Healthy: {
    badge: "bg-risk-healthy/10 text-risk-healthy",
    border: "border-l-risk-healthy",
    bgTint: "",
  },
};

function formatArr(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function toPanelAccount(a: RawAccount): Account {
  const signals: AccountSignals = {
    lastLoginDays: a.signals.last_login_days,
    lastReplyDays: a.signals.last_reply_days,
    openTickets: a.signals.ticket_count_30d,
    ticketSentiment: a.signals.ticket_sentiment,
    npsScore: a.signals.nps_score,
    usageTrend: a.signals.usage_trend,
    notes: a.notes ?? "",
  };
  return {
    id: a.id,
    name: a.name,
    industry: a.industry,
    arr: a.arr,
    daysToRenewal: a.days_to_renewal,
    champion: a.champion,
    championStatus: a.champion_status,
    signals,
  };
}

// ---------- sort + filter ----------

type SortKey = "risk-desc" | "risk-asc" | "renewal" | "arr" | "updated";
type FilterKey = "all" | LevelKey;

const filterChips: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Critical", label: "Critical" },
  { key: "At Risk", label: "At Risk" },
  { key: "Monitor", label: "Monitor" },
  { key: "Healthy", label: "Healthy" },
];

// ---------- tiles ----------

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: Tone;
}) {
  return (
    <div className="rounded-md border bg-card px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${toneClass[tone]}`}>
        {value}
      </div>
    </div>
  );
}

// ---------- summary cards ----------

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "red" | "amber" | "purple";
}) {
  const toneMap = {
    red: {
      border: "border-risk-critical/30",
      bg: "bg-risk-critical/5",
      fg: "text-risk-critical",
      iconBg: "bg-risk-critical/15",
    },
    amber: {
      border: "border-risk-atrisk/30",
      bg: "bg-risk-atrisk/5",
      fg: "text-risk-atrisk",
      iconBg: "bg-risk-atrisk/15",
    },
    purple: {
      border: "border-ai-accent/30",
      bg: "bg-ai-accent/5",
      fg: "text-ai-accent",
      iconBg: "bg-ai-accent/15",
    },
  } as const;
  const t = toneMap[tone];
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border ${t.border} ${t.bg} px-4 py-3`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${t.iconBg} ${t.fg}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`text-xl font-semibold tabular-nums leading-tight ${t.fg}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ---------- card ----------

function SignalCard({
  account,
  onOpen,
  analysis,
  analyzing,
  analysisError,
  onAnalyze,
}: {
  account: RawAccount;
  onOpen: () => void;
  analysis: AnalysisResult | null;
  analyzing: boolean;
  analysisError: string | null;
  onAnalyze: () => void;
}) {
  const lvl = account.risk_level;
  const ls = levelStyles[lvl];
  const s = account.signals;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group cursor-pointer rounded-lg border border-l-4 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${ls.border} ${ls.bgTint}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold leading-tight">{account.name}</h3>
          <Badge variant="outline" className="border-border bg-muted/40 font-normal">
            {account.industry}
          </Badge>
          <Badge variant="outline" className="border-border bg-muted/40 font-normal">
            {account.segment}
          </Badge>
          <Badge variant="outline" className={`border-transparent font-medium ${ls.badge}`}>
            {lvl}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            <span className="tabular-nums">{account.churn_probability_pct}%</span> churn risk
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Last updated: May 10, 2026
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              stop(e);
              onAnalyze();
            }}
            disabled={analyzing}
            className="h-7 gap-1.5 border-ai-accent/40 text-ai-accent hover:bg-ai-accent/10 hover:text-ai-accent"
          >
            {analyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {analysis ? "Re-analyze" : "Analyze"}
          </Button>
        </div>
      </div>

      {/* Tiles */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Tile label="Last Login" value={`${s.last_login_days}d`} tone={daysTone(s.last_login_days)} />
        <Tile label="Last Reply" value={`${s.last_reply_days}d`} tone={daysTone(s.last_reply_days)} />
        <Tile label="Open Tickets" value={s.ticket_count_30d} tone={ticketsTone(s.ticket_count_30d)} />
        <Tile label="Critical Tix" value={s.critical_ticket_count} tone={critTicketsTone(s.critical_ticket_count)} />
        <Tile label="NPS Score" value={s.nps_score} tone={npsTone(s.nps_score)} />
        <Tile label="Usage Trend" value={<span className="capitalize">{s.usage_trend}</span>} tone={usageTone(s.usage_trend)} />
        <Tile label="Mtg Attend" value={`${s.meeting_attendance_rate_pct}%`} tone={meetingTone(s.meeting_attendance_rate_pct)} />
        <Tile label="Renewal" value={`${account.days_to_renewal}d`} tone={renewalTone(account.days_to_renewal)} />
      </div>

      {/* Risk driver tags */}
      {account.top_risk_drivers.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {account.top_risk_drivers.map((d) => (
            <span
              key={d}
              className="inline-flex items-center rounded-full bg-risk-critical/10 px-2.5 py-0.5 text-[11px] font-medium text-risk-critical"
            >
              {d}
            </span>
          ))}
        </div>
      ) : null}

      {/* Footer */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs">
        <div className="min-w-0 flex-1">
          <div className="truncate text-muted-foreground">
            <span className="font-medium text-foreground">Goal:</span> {account.primary_goal}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground/70"
                style={{ width: `${s.goal_progress_pct}%` }}
              />
            </div>
            <span className="tabular-nums text-muted-foreground">
              {s.goal_progress_pct}%
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`border-transparent font-medium ${
            s.payment_status === "Current"
              ? "bg-risk-healthy/10 text-risk-healthy"
              : "bg-risk-critical/10 text-risk-critical"
          }`}
        >
          Payment: {s.payment_status}
        </Badge>
        <Badge
          variant="outline"
          className={`border-transparent font-medium ${
            account.champion_status === "active"
              ? "bg-risk-healthy/10 text-risk-healthy"
              : account.champion_status === "quiet"
                ? "bg-risk-atrisk/10 text-risk-atrisk"
                : "bg-risk-critical/10 text-risk-critical"
          }`}
        >
          Champion:{" "}
          {account.champion_status === "active"
            ? "Active"
            : account.champion_status === "quiet"
              ? "Gone Quiet"
              : "Left Company"}
        </Badge>
      </div>

      {/* AI analysis result */}
      {analysisError ? (
        <div
          onClick={stop}
          className="mt-3 rounded-md border border-risk-critical/30 bg-risk-critical/5 p-3 text-xs text-risk-critical"
        >
          {analysisError}
        </div>
      ) : null}
      {analysis ? (
        <div
          onClick={stop}
          className="mt-3 rounded-md border border-ai-accent/30 bg-gradient-to-br from-ai-accent/10 via-ai-accent/5 to-transparent p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-ai-accent" />
            <span className="text-xs font-semibold text-ai-accent">AI Risk Analysis</span>
          </div>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
          <div className="mt-2 space-y-1.5">
            {analysis.steps.map((step, i) => (
              <div
                key={i}
                className="rounded-md border-l-2 border-ai-accent bg-card/60 p-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold tabular-nums text-ai-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-medium">{step.title}</span>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {step.timeline}
                  </span>
                </div>
                {step.detail ? (
                  <p className="mt-0.5 pl-5 text-[11px] leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- page ----------

function SignalLogPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("risk-desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const analyze = useServerFn(analyzeAccount);
  type Entry = { result: AnalysisResult | null; loading: boolean; error: string | null };
  const [analyses, setAnalyses] = useState<Record<string, Entry>>({});

  const summary = useMemo(() => {
    const attention = ALL.filter(
      (a) => a.risk_level === "Critical" || a.risk_level === "At Risk",
    );
    const arrAtRisk = attention.reduce((sum, a) => sum + a.arr_at_risk, 0);
    const avgChurn =
      attention.length > 0
        ? Math.round(
            attention.reduce((s, a) => s + a.churn_probability_pct, 0) / attention.length,
          )
        : 0;
    return { count: attention.length, arrAtRisk, avgChurn };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL.filter((a) => {
      if (filter !== "all" && a.risk_level !== filter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) || a.industry.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sort) {
        case "risk-desc":
          return (
            levelOrder[b.risk_level] - levelOrder[a.risk_level] ||
            b.churn_probability_pct - a.churn_probability_pct
          );
        case "risk-asc":
          return (
            levelOrder[a.risk_level] - levelOrder[b.risk_level] ||
            a.churn_probability_pct - b.churn_probability_pct
          );
        case "renewal":
          return a.days_to_renewal - b.days_to_renewal;
        case "arr":
          return b.arr - a.arr;
        case "updated":
          return a.name.localeCompare(b.name);
      }
    });
    return arr;
  }, [filtered, sort]);

  const runAnalyze = async (a: RawAccount) => {
    setAnalyses((p) => ({ ...p, [a.id]: { result: p[a.id]?.result ?? null, loading: true, error: null } }));
    try {
      const panel = toPanelAccount(a);
      const r = await analyze({
        data: {
          name: panel.name,
          industry: panel.industry,
          arr: panel.arr,
          daysToRenewal: panel.daysToRenewal,
          championStatus: panel.championStatus,
          score: a.churn_probability_pct,
          level: a.risk_level,
          signals: panel.signals,
        },
      });
      setAnalyses((p) => ({ ...p, [a.id]: { result: r, loading: false, error: null } }));
    } catch (e) {
      setAnalyses((p) => ({
        ...p,
        [a.id]: {
          result: p[a.id]?.result ?? null,
          loading: false,
          error: e instanceof Error ? e.message : "Analysis failed",
        },
      }));
    }
  };

  const selected = selectedId ? ALL.find((a) => a.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Weekly review"
        title="Signal Log"
        meta={`Week ending May 10, 2026 · ${ALL.length} accounts under review`}
      />

      {/* Summary bar */}
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Accounts Needing Attention"
          value={String(summary.count)}
          icon={AlertTriangle}
          tone="red"
        />
        <SummaryCard
          label="Total ARR at Risk"
          value={formatArr(summary.arrAtRisk)}
          icon={DollarSign}
          tone="amber"
        />
        <SummaryCard
          label="Avg Churn Probability"
          value={`${summary.avgChurn}%`}
          icon={TrendingDown}
          tone="purple"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or industry…"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-full lg:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk-desc">Highest Risk First</SelectItem>
            <SelectItem value="risk-asc">Lowest Risk First</SelectItem>
            <SelectItem value="renewal">Renewal Soonest</SelectItem>
            <SelectItem value="arr">ARR Highest</SelectItem>
            <SelectItem value="updated">Last Updated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            onReset={() => {
              setFilter("all");
              setQuery("");
            }}
          />
        </div>
      ) : (
        <div className="stagger space-y-3">
          {sorted.map((a) => {
            const entry = analyses[a.id];
            return (
              <SignalCard
                key={a.id}
                account={a}
                onOpen={() => setSelectedId(a.id)}
                analysis={entry?.result ?? null}
                analyzing={entry?.loading ?? false}
                analysisError={entry?.error ?? null}
                onAnalyze={() => runAnalyze(a)}
              />
            );
          })}
        </div>
      )}

      <AccountDetailPanel
        account={selected ? toPanelAccount(selected) : null}
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />
    </div>
  );
}