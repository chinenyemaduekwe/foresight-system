import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { scoreAccount } from "@/data/mockData";
import type { Account, AccountSignals, RiskLevel } from "@/data/mockData";
import { useAccounts } from "@/hooks/use-accounts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Minus,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — Foresight" },
      { name: "description", content: "Browse and triage customer accounts." },
    ],
  }),
  component: AccountsPage,
});

type RiskTone = "critical" | "atrisk" | "monitor" | "healthy" | "avg";

const toneStyles: Record<RiskTone, { bg: string; fg: string; bar: string }> = {
  critical: { bg: "bg-risk-critical/10", fg: "text-risk-critical", bar: "bg-risk-critical" },
  atrisk:   { bg: "bg-risk-atrisk/10",   fg: "text-risk-atrisk",   bar: "bg-risk-atrisk" },
  monitor:  { bg: "bg-risk-monitor/10",  fg: "text-risk-monitor",  bar: "bg-risk-monitor" },
  healthy:  { bg: "bg-risk-healthy/10",  fg: "text-risk-healthy",  bar: "bg-risk-healthy" },
  avg:      { bg: "bg-risk-avg/10",      fg: "text-risk-avg",      bar: "bg-risk-avg" },
};

const levelLabel: Record<RiskLevel, string> = {
  critical: "Critical",
  atrisk: "At risk",
  monitor: "Monitor",
  healthy: "Healthy",
};

function priorScore(id: string, current: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const delta = (Math.abs(h) % 21) - 10;
  return Math.max(0, Math.min(100, current - delta));
}

function trendOf(current: number, prior: number): "up" | "down" | "flat" {
  const d = current - prior;
  if (d >= 4) return "up";
  if (d <= -4) return "down";
  return "flat";
}

function signalTones(s: AccountSignals): RiskTone[] {
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

type ScoredAccount = Account & {
  score: number;
  level: RiskLevel;
  color: string;
  prior: number;
  trend: "up" | "down" | "flat";
};

type SortKey = "name" | "industry" | "score" | "level" | "arr" | "renewal";
type SortDir = "asc" | "desc";

const levelRank: Record<RiskLevel, number> = { critical: 4, atrisk: 3, monitor: 2, healthy: 1 };
const filterChips: { key: "all" | RiskLevel; label: string; tone?: RiskTone }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical", tone: "critical" },
  { key: "atrisk", label: "At risk", tone: "atrisk" },
  { key: "monitor", label: "Monitor", tone: "monitor" },
  { key: "healthy", label: "Healthy", tone: "healthy" },
];

function formatArr(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n}`;
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 text-left font-medium ${
        active ? "text-foreground" : "text-muted-foreground"
      } hover:text-foreground ${className ?? ""}`}
    >
      {label}
      <Icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
    </button>
  );
}

function AccountsPage() {
  const { data: accounts, isLoading, error } = useAccounts();
  const [filter, setFilter] = useState<"all" | RiskLevel>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scored: ScoredAccount[] = useMemo(
    () =>
      (accounts ?? []).map((a) => {
        const r = scoreAccount(a);
        const prior = priorScore(a.id, r.score);
        return { ...a, ...r, prior, trend: trendOf(r.score, prior) };
      }),
    [accounts],
  );

  const counts = useMemo(() => {
    const c = { all: scored.length, critical: 0, atrisk: 0, monitor: 0, healthy: 0 };
    scored.forEach((a) => {
      c[a.level] += 1;
    });
    return c;
  }, [scored]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scored.filter((a) => {
      if (filter !== "all" && a.level !== filter) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.industry.toLowerCase().includes(q);
    });
  }, [scored, filter, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":     return a.name.localeCompare(b.name) * dir;
        case "industry": return a.industry.localeCompare(b.industry) * dir;
        case "score":    return (a.score - b.score) * dir;
        case "level":    return (levelRank[a.level] - levelRank[b.level]) * dir;
        case "arr":      return (a.arr - b.arr) * dir;
        case "renewal":  return (a.daysToRenewal - b.daysToRenewal) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "industry" ? "asc" : "desc");
    }
  };

  const selected = selectedId ? scored.find((a) => a.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading accounts…"
            : error
              ? "Failed to load accounts."
              : `${sorted.length} of ${scored.length} accounts`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map((c) => {
            const active = filter === c.key;
            const t = c.tone ? toneStyles[c.tone] : null;
            const count = counts[c.key];
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? t
                      ? `border-transparent ${t.bg} ${t.fg}`
                      : "border-transparent bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {t ? <span className={`h-1.5 w-1.5 rounded-full ${t.bar}`} /> : null}
                {c.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or industry…"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[22%]">
                <SortHeader label="Account" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              </TableHead>
              <TableHead className="w-[12%]">
                <SortHeader label="Industry" active={sortKey === "industry"} dir={sortDir} onClick={() => toggleSort("industry")} />
              </TableHead>
              <TableHead className="w-[16%]">
                <SortHeader label="Risk score" active={sortKey === "score"} dir={sortDir} onClick={() => toggleSort("score")} />
              </TableHead>
              <TableHead className="w-[10%]">
                <SortHeader label="Status" active={sortKey === "level"} dir={sortDir} onClick={() => toggleSort("level")} />
              </TableHead>
              <TableHead className="w-[12%]">Signals</TableHead>
              <TableHead className="w-[10%]">Trend</TableHead>
              <TableHead className="w-[10%] text-right">
                <SortHeader label="ARR" active={sortKey === "arr"} dir={sortDir} onClick={() => toggleSort("arr")} className="ml-auto" />
              </TableHead>
              <TableHead className="w-[8%] text-right">
                <SortHeader label="Renewal" active={sortKey === "renewal"} dir={sortDir} onClick={() => toggleSort("renewal")} className="ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((a) => {
              const t = toneStyles[a.level as RiskTone];
              return (
                <TableRow
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.id}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.industry}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full ${t.bar} transition-all`} style={{ width: `${a.score}%` }} />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{a.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-transparent font-medium ${t.bg} ${t.fg}`}>
                      {levelLabel[a.level]}
                    </Badge>
                  </TableCell>
                  <TableCell><SignalDots signals={a.signals} /></TableCell>
                  <TableCell><TrendArrow dir={a.trend} /></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatArr(a.arr)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{a.daysToRenewal}d</TableCell>
                </TableRow>
              );
            })}
            {!isLoading && sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No accounts match your filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selected ? <AccountDetail account={selected} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AccountDetail({ account }: { account: ScoredAccount }) {
  const t = toneStyles[account.level as RiskTone];
  const tones = signalTones(account.signals);
  const s = account.signals;
  const fields: { label: string; value: React.ReactNode; tone: RiskTone }[] = [
    { label: "Last login",   value: `${s.lastLoginDays}d ago`, tone: tones[0] },
    { label: "Last reply",   value: `${s.lastReplyDays}d ago`, tone: tones[1] },
    { label: "Open tickets", value: s.openTickets,             tone: tones[2] },
    { label: "Sentiment",    value: s.ticketSentiment,         tone: tones[3] },
    { label: "NPS",          value: s.npsScore,                tone: tones[4] },
    { label: "Usage trend",  value: s.usageTrend,              tone: tones[5] },
  ];
  return (
    <div className="space-y-6">
      <SheetHeader className="space-y-2 text-left">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`border-transparent font-medium ${t.bg} ${t.fg}`}>
            {levelLabel[account.level]}
          </Badge>
          <span className="text-xs text-muted-foreground">{account.id}</span>
        </div>
        <SheetTitle className="text-xl">{account.name}</SheetTitle>
        <SheetDescription>
          {account.industry} · {formatArr(account.arr)} ARR · {account.daysToRenewal}d to renewal
        </SheetDescription>
      </SheetHeader>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Risk score</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{account.score}</p>
          </div>
          <TrendArrow dir={account.trend} />
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${t.bar}`} style={{ width: `${account.score}%` }} />
        </div>
      </Card>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Signals
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => {
            const ft = toneStyles[f.tone];
            return (
              <div key={f.label} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${ft.bar}`} />
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                </div>
                <p className="mt-1 text-sm font-medium capitalize">{f.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Champion
        </h3>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{account.champion || "—"}</p>
            <p className="text-xs capitalize text-muted-foreground">{account.championStatus}</p>
          </div>
          <Badge
            variant="outline"
            className={`border-transparent capitalize ${
              account.championStatus === "active"
                ? toneStyles.healthy.bg + " " + toneStyles.healthy.fg
                : account.championStatus === "quiet"
                  ? toneStyles.atrisk.bg + " " + toneStyles.atrisk.fg
                  : toneStyles.critical.bg + " " + toneStyles.critical.fg
            }`}
          >
            {account.championStatus}
          </Badge>
        </div>
      </div>

      {account.signals.notes ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </h3>
          <p className="rounded-lg border p-3 text-sm leading-relaxed text-muted-foreground">
            {account.signals.notes}
          </p>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button className="flex-1">Open playbook</Button>
        <Button variant="outline" className="flex-1">Log signal</Button>
      </div>
    </div>
  );
}