import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Loader2, MessageSquare, Sparkles, Star, TrendingUp, UserCheck } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

import type { Account, AccountSignals } from "@/data/mockData";
import { scoreAccount } from "@/data/mockData";
import { analyzeAccount, type AnalysisResult } from "@/lib/analyze-account.functions";
import {
  championTone,
  formatArr,
  levelLabel,
  scoreHistory,
  signalNote,
  signalTones,
  toneStyles,
  trendOf,
  priorScore,
  type RiskTone,
} from "@/lib/risk";

type Props = {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function RiskGauge({ score, tone }: { score: number; tone: RiskTone }) {
  // semicircle: 180° arc; needle/fill proportional to score
  const r = 80;
  const cx = 100;
  const cy = 100;
  const circumference = Math.PI * r; // half circle length
  const filled = (score / 100) * circumference;
  const remaining = circumference - filled;
  const t = toneStyles[tone];
  const stroke = `var(--risk-${tone})`;
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]">
        {/* track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* filled arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={stroke}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${remaining}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="-mt-12 flex flex-col items-center">
        <span className={`text-4xl font-semibold tabular-nums ${t.fg}`}>{score}</span>
        <span className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
          Risk score
        </span>
      </div>
      <div className="mt-2 flex w-full max-w-[260px] justify-between px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>0 Healthy</span>
        <span>100 Critical</span>
      </div>
    </div>
  );
}

const signalIcon = {
  login: Activity,
  reply: MessageSquare,
  tickets: AlertTriangle,
  nps: Star,
  usage: TrendingUp,
  champion: UserCheck,
} as const;

function SignalCard({
  icon,
  label,
  value,
  tone,
  note,
}: {
  icon: keyof typeof signalIcon;
  label: string;
  value: React.ReactNode;
  tone: RiskTone;
  note: string;
}) {
  const Icon = signalIcon[icon];
  const t = toneStyles[tone];
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <span className={`h-2 w-2 rounded-full ${t.bar}`} />
      </div>
      <div className="mt-1.5 text-lg font-semibold capitalize tabular-nums">{value}</div>
      <div className={`text-xs font-medium ${t.fg}`}>{note}</div>
    </div>
  );
}

function SparklineChart({
  data,
  tone,
}: {
  data: { week: string; score: number }[];
  tone: RiskTone;
}) {
  const stroke = `var(--risk-${tone})`;
  const id = `spark-${tone}`;
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: 3 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              padding: "6px 10px",
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type FormState = {
  lastLoginDays: number;
  lastReplyDays: number;
  openTickets: number;
  ticketSentiment: AccountSignals["ticketSentiment"];
  npsScore: number;
  usageTrend: AccountSignals["usageTrend"];
  championStatus: Account["championStatus"];
  notes: string;
};

function toForm(a: Account): FormState {
  return {
    lastLoginDays: a.signals.lastLoginDays,
    lastReplyDays: a.signals.lastReplyDays,
    openTickets: a.signals.openTickets,
    ticketSentiment: a.signals.ticketSentiment,
    npsScore: a.signals.npsScore,
    usageTrend: a.signals.usageTrend,
    championStatus: a.championStatus,
    notes: a.signals.notes,
  };
}

export function AccountDetailPanel({ account, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(account ? toForm(account) : null);
  const [saved, setSaved] = useState(false);
  const analyze = useServerFn(analyzeAccount);
  const [analysisCache, setAnalysisCache] = useState<
    Record<string, { key: string; result: AnalysisResult }>
  >({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setForm(toForm(account));
      setSaved(false);
    }
  }, [account?.id]);

  const liveAccount: Account | null = useMemo(() => {
    if (!account || !form) return account;
    return {
      ...account,
      championStatus: form.championStatus,
      signals: {
        lastLoginDays: Number(form.lastLoginDays) || 0,
        lastReplyDays: Number(form.lastReplyDays) || 0,
        openTickets: Number(form.openTickets) || 0,
        ticketSentiment: form.ticketSentiment,
        npsScore: Number(form.npsScore) || 0,
        usageTrend: form.usageTrend,
        notes: form.notes,
      },
    };
  }, [account, form]);

  const result = useMemo(
    () => (liveAccount ? scoreAccount(liveAccount) : null),
    [liveAccount],
  );

  const history = useMemo(() => {
    if (!liveAccount || !result) return [];
    return scoreHistory(liveAccount.id, result.score);
  }, [liveAccount, result]);

  const handleSave = () => {
    if (!liveAccount) return;
    qc.setQueryData<Account[]>(["accounts"], (prev) => {
      if (!prev) return prev;
      return prev.map((a) => (a.id === liveAccount.id ? liveAccount : a));
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const signalKey = liveAccount
    ? JSON.stringify({ s: liveAccount.signals, c: liveAccount.championStatus })
    : "";
  const cached = liveAccount ? analysisCache[liveAccount.id] : undefined;
  const analysis = cached && cached.key === signalKey ? cached.result : null;

  const runAnalysis = async () => {
    if (!liveAccount || !result) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const r = await analyze({
        data: {
          name: liveAccount.name,
          industry: liveAccount.industry,
          arr: liveAccount.arr,
          daysToRenewal: liveAccount.daysToRenewal,
          championStatus: liveAccount.championStatus,
          score: result.score,
          level: result.level,
          signals: liveAccount.signals,
        },
      });
      setAnalysisCache((prev) => ({
        ...prev,
        [liveAccount.id]: { key: signalKey, result: r },
      }));
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-none sm:w-[480px]"
      >
        {liveAccount && result && form ? (
          <div className="flex flex-col">
            {/* Header */}
            <SheetHeader className="space-y-2 border-b bg-muted/30 p-6 text-left">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`border-transparent font-medium ${toneStyles[result.level as RiskTone].bg} ${toneStyles[result.level as RiskTone].fg}`}
                >
                  {levelLabel[result.level]}
                </Badge>
                <span className="text-xs text-muted-foreground">{liveAccount.id}</span>
              </div>
              <SheetTitle className="text-xl">{liveAccount.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>{liveAccount.industry}</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-medium text-foreground">
                  {formatArr(liveAccount.arr)} ARR
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span>{liveAccount.daysToRenewal}d to renewal</span>
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 p-6">
              {/* Gauge */}
              <RiskGauge score={result.score} tone={result.level as RiskTone} />

              {/* Signal grid */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Signals
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {(() => {
                    const tones = signalTones(liveAccount.signals);
                    const s = liveAccount.signals;
                    return (
                      <>
                        <SignalCard
                          icon="login"
                          label="Last login"
                          value={`${s.lastLoginDays}d`}
                          tone={tones[0]}
                          note={signalNote("login", s)}
                        />
                        <SignalCard
                          icon="reply"
                          label="Last reply"
                          value={`${s.lastReplyDays}d`}
                          tone={tones[1]}
                          note={signalNote("reply", s)}
                        />
                        <SignalCard
                          icon="tickets"
                          label="Open tickets"
                          value={s.openTickets}
                          tone={tones[2]}
                          note={signalNote("tickets", s)}
                        />
                        <SignalCard
                          icon="nps"
                          label="NPS score"
                          value={s.npsScore}
                          tone={tones[4]}
                          note={signalNote("nps", s)}
                        />
                        <SignalCard
                          icon="usage"
                          label="Usage trend"
                          value={s.usageTrend}
                          tone={tones[5]}
                          note={signalNote("usage", s)}
                        />
                        <SignalCard
                          icon="champion"
                          label="Champion"
                          value={liveAccount.championStatus}
                          tone={championTone(liveAccount.championStatus)}
                          note={signalNote("champion", liveAccount.championStatus)}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Sparkline */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Risk trend · last 4 weeks
                  </h3>
                  {(() => {
                    const prior = priorScore(liveAccount.id, result.score);
                    const dir = trendOf(result.score, prior);
                    const labelTone =
                      dir === "up" ? "text-risk-critical" : dir === "down" ? "text-risk-healthy" : "text-muted-foreground";
                    const label = dir === "up" ? "Worsening" : dir === "down" ? "Improving" : "Steady";
                    return <span className={`text-xs font-medium ${labelTone}`}>{label}</span>;
                  })()}
                </div>
                <Card className="p-3">
                  <SparklineChart data={history} tone={result.level as RiskTone} />
                </Card>
              </div>

              {/* Notes */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </h3>
                <p className="rounded-lg border bg-card p-3 text-sm leading-relaxed text-muted-foreground">
                  {liveAccount.signals.notes || "No notes recorded for this account."}
                </p>
              </div>

              {/* AI Analysis */}
              <div className="rounded-lg border border-ai-accent/30 bg-gradient-to-br from-ai-accent/10 via-ai-accent/5 to-transparent p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ai-accent/15 text-ai-accent">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">AI Risk Analysis</h3>
                  </div>
                  {analysis ? (
                    <Button
                      onClick={runAnalysis}
                      disabled={analyzing}
                      size="sm"
                      variant="outline"
                      className="h-7 border-ai-accent/40 text-ai-accent hover:bg-ai-accent/10 hover:text-ai-accent"
                    >
                      {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-analyze"}
                    </Button>
                  ) : null}
                </div>

                {analyzing ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-ai-accent" />
                    Analyzing signals with AI…
                  </div>
                ) : analysis ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-foreground/90">{analysis.summary}</p>
                    <div className="space-y-2">
                      {analysis.steps.map((step, i) => (
                        <div
                          key={i}
                          className="rounded-md border-l-2 border-ai-accent bg-card/60 p-3"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold tabular-nums text-ai-accent">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="text-sm font-medium">{step.title}</span>
                            </div>
                            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {step.timeline}
                            </span>
                          </div>
                          {step.detail ? (
                            <p className="mt-1 pl-6 text-xs leading-relaxed text-muted-foreground">
                              {step.detail}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Get a plain-English risk summary and a prioritized action plan
                      tailored to this account's signals.
                    </p>
                    <Button
                      onClick={runAnalysis}
                      disabled={analyzing}
                      size="sm"
                      className="bg-ai-accent text-ai-accent-foreground hover:bg-ai-accent/90"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Analyze Account
                    </Button>
                  </div>
                )}

                {analysisError ? (
                  <p className="mt-3 text-xs text-risk-critical">{analysisError}</p>
                ) : null}
              </div>

              {/* Update form */}
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Update signals</h3>
                  <span className="text-xs text-muted-foreground">Recalculates risk score</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldNumber
                    label="Last login (days)"
                    value={form.lastLoginDays}
                    onChange={(v) => setForm({ ...form, lastLoginDays: v })}
                  />
                  <FieldNumber
                    label="Last reply (days)"
                    value={form.lastReplyDays}
                    onChange={(v) => setForm({ ...form, lastReplyDays: v })}
                  />
                  <FieldNumber
                    label="Open tickets"
                    value={form.openTickets}
                    onChange={(v) => setForm({ ...form, openTickets: v })}
                  />
                  <FieldNumber
                    label="NPS score"
                    value={form.npsScore}
                    onChange={(v) => setForm({ ...form, npsScore: v })}
                    min={0}
                    max={10}
                  />
                  <FieldSelect
                    label="Sentiment"
                    value={form.ticketSentiment}
                    onChange={(v) =>
                      setForm({ ...form, ticketSentiment: v as AccountSignals["ticketSentiment"] })
                    }
                    options={["positive", "neutral", "frustrated", "angry"]}
                  />
                  <FieldSelect
                    label="Usage trend"
                    value={form.usageTrend}
                    onChange={(v) =>
                      setForm({ ...form, usageTrend: v as AccountSignals["usageTrend"] })
                    }
                    options={["growing", "stable", "declining", "dropped"]}
                  />
                  <FieldSelect
                    label="Champion status"
                    value={form.championStatus}
                    onChange={(v) =>
                      setForm({ ...form, championStatus: v as Account["championStatus"] })
                    }
                    options={["active", "quiet", "left"]}
                  />
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {saved ? (
                      <span className="font-medium text-risk-healthy">Signals saved</span>
                    ) : (
                      <>
                        New risk score:{" "}
                        <span className={`font-semibold ${toneStyles[result.level as RiskTone].fg}`}>
                          {result.score}
                        </span>
                      </>
                    )}
                  </div>
                  <Button onClick={handleSave} size="sm">
                    Save signals
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9"
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="capitalize">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}