import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, Plus, UploadCloud } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { scoreAccount } from "@/data/mockData";
import type { Account, AccountSignals } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CSV_HEADERS = [
  "company_name",
  "industry",
  "arr",
  "days_to_renewal",
  "champion_name",
  "champion_status",
  "last_login_days",
  "last_reply_days",
  "open_tickets",
  "ticket_sentiment",
  "nps_score",
  "usage_trend",
  "notes",
] as const;

const SENTIMENTS = ["positive", "neutral", "frustrated", "angry"] as const;
const TRENDS = ["growing", "stable", "declining", "dropped"] as const;
const STATUSES = ["active", "quiet", "left"] as const;

type ParsedRow = {
  raw: Record<string, unknown>;
  account: Omit<Account, "id"> | null;
  errors: string[];
};

function genId() {
  return `ACC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSentiment(v: unknown): AccountSignals["ticketSentiment"] | null {
  const s = String(v ?? "").trim().toLowerCase();
  return (SENTIMENTS as readonly string[]).includes(s)
    ? (s as AccountSignals["ticketSentiment"])
    : null;
}

function normalizeTrend(v: unknown): AccountSignals["usageTrend"] | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "dropped significantly" || s === "dropped_significantly") return "dropped";
  return (TRENDS as readonly string[]).includes(s)
    ? (s as AccountSignals["usageTrend"])
    : null;
}

function normalizeStatus(v: unknown): Account["championStatus"] {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "gone quiet" || s === "quiet") return "quiet";
  if (s === "left company" || s === "left") return "left";
  return "active";
}

// Accepts flat CSV-like rows OR nested {signals: {...}} JSON objects.
function parseRow(obj: Record<string, unknown>): ParsedRow {
  const errors: string[] = [];
  const nested = (obj.signals && typeof obj.signals === "object")
    ? (obj.signals as Record<string, unknown>)
    : {};

  const pick = (k: string) => (k in obj ? obj[k] : nested[k]);

  const name = String(obj.company_name ?? obj.name ?? "").trim();
  if (!name) errors.push("company_name is required");

  const sentimentRaw = pick("ticket_sentiment");
  const sentiment = normalizeSentiment(sentimentRaw) ?? "neutral";
  if (sentimentRaw && !normalizeSentiment(sentimentRaw)) {
    errors.push(`invalid ticket_sentiment "${String(sentimentRaw)}"`);
  }

  const trendRaw = pick("usage_trend");
  const trend = normalizeTrend(trendRaw) ?? "stable";
  if (trendRaw && !normalizeTrend(trendRaw)) {
    errors.push(`invalid usage_trend "${String(trendRaw)}"`);
  }

  const signals: AccountSignals = {
    lastLoginDays: toNum(pick("last_login_days")),
    lastReplyDays: toNum(pick("last_reply_days")),
    openTickets: toNum(pick("open_tickets") ?? pick("ticket_count_30d")),
    ticketSentiment: sentiment,
    npsScore: Math.max(0, Math.min(10, toNum(pick("nps_score"), 7))),
    usageTrend: trend,
    notes: String(obj.notes ?? ""),
  };

  if (errors.length) return { raw: obj, account: null, errors };

  return {
    raw: obj,
    errors: [],
    account: {
      name,
      industry: String(obj.industry ?? ""),
      arr: toNum(obj.arr),
      daysToRenewal: toNum(obj.days_to_renewal, 365),
      champion: String(obj.champion_name ?? obj.champion ?? ""),
      championStatus: normalizeStatus(obj.champion_status),
      signals,
    },
  };
}

function accountToRow(a: Omit<Account, "id">) {
  return {
    id: genId(),
    name: a.name,
    industry: a.industry || null,
    arr: a.arr,
    days_to_renewal: a.daysToRenewal,
    champion: a.champion || null,
    champion_status: a.championStatus,
    signals: a.signals as unknown as Json,
  };
}

function downloadTemplate() {
  const sample = [
    {
      company_name: "Acme Inc",
      industry: "SaaS",
      arr: 24000,
      days_to_renewal: 90,
      champion_name: "Jane Doe",
      champion_status: "active",
      last_login_days: 3,
      last_reply_days: 2,
      open_tickets: 1,
      ticket_sentiment: "positive",
      nps_score: 9,
      usage_trend: "growing",
      notes: "Healthy account",
    },
  ];
  const csv = Papa.unparse({ fields: [...CSV_HEADERS], data: sample.map((r) => CSV_HEADERS.map((h) => (r as Record<string, unknown>)[h])) });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "accounts-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function AddAccountDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("manual");

  // Manual form
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [arr, setArr] = useState("");
  const [renewal, setRenewal] = useState("");
  const [champion, setChampion] = useState("");
  const [champStatus, setChampStatus] = useState<Account["championStatus"]>("active");
  const [lastLogin, setLastLogin] = useState("");
  const [lastReply, setLastReply] = useState("");
  const [tickets, setTickets] = useState("");
  const [sentiment, setSentiment] = useState<AccountSignals["ticketSentiment"]>("neutral");
  const [nps, setNps] = useState([7]);
  const [usage, setUsage] = useState<AccountSignals["usageTrend"]>("stable");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Import state
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validCount = useMemo(() => rows.filter((r) => r.account).length, [rows]);
  const invalidCount = rows.length - validCount;
  const columns = useMemo(() => {
    const set = new Set<string>();
    rows.slice(0, 5).forEach((r) => Object.keys(r.raw).forEach((k) => k !== "signals" && set.add(k)));
    return Array.from(set);
  }, [rows]);

  const resetManual = () => {
    setName(""); setIndustry(""); setArr(""); setRenewal(""); setChampion("");
    setChampStatus("active"); setLastLogin(""); setLastReply(""); setTickets("");
    setSentiment("neutral"); setNps([7]); setUsage("stable"); setNotes("");
  };

  const resetImport = () => { setRows([]); setParsing(false); };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    const account: Omit<Account, "id"> = {
      name: name.trim(),
      industry: industry.trim(),
      arr: toNum(arr),
      daysToRenewal: toNum(renewal, 365),
      champion: champion.trim(),
      championStatus: champStatus,
      signals: {
        lastLoginDays: toNum(lastLogin),
        lastReplyDays: toNum(lastReply),
        openTickets: toNum(tickets),
        ticketSentiment: sentiment,
        npsScore: nps[0] ?? 7,
        usageTrend: usage,
        notes,
      },
    };
    const row = accountToRow(account);
    const { error } = await supabase.from("accounts").insert(row);
    setSaving(false);
    if (error) {
      toast.error(`Failed to add account: ${error.message}`);
      return;
    }
    const scored = scoreAccount({ ...account, id: row.id });
    toast.success(`${account.name} added`, { description: `Risk score ${scored.score} · ${scored.level}` });
    await qc.invalidateQueries({ queryKey: ["accounts"] });
    resetManual();
    setOpen(false);
  };

  const ingestData = useCallback((data: unknown) => {
    let arr2: Record<string, unknown>[] = [];
    if (Array.isArray(data)) arr2 = data as Record<string, unknown>[];
    else if (data && typeof data === "object") arr2 = [data as Record<string, unknown>];
    setRows(arr2.map(parseRow));
  }, []);

  const handleFile = useCallback((file: File) => {
    setParsing(true);
    setRows([]);
    const isJson = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    if (isJson) {
      file.text().then((text) => {
        try {
          ingestData(JSON.parse(text));
        } catch {
          toast.error("Invalid JSON file");
        } finally {
          setParsing(false);
        }
      });
    } else {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          ingestData(result.data);
          setParsing(false);
        },
        error: () => {
          toast.error("Failed to parse CSV");
          setParsing(false);
        },
      });
    }
  }, [ingestData]);

  const handleImport = async () => {
    const valid = rows.filter((r) => r.account).map((r) => accountToRow(r.account!));
    if (!valid.length) return;
    setImporting(true);
    const { error } = await supabase.from("accounts").insert(valid);
    setImporting(false);
    if (error) {
      toast.error(`Import failed: ${error.message}`);
      return;
    }
    toast.success(`Successfully imported ${valid.length} account${valid.length === 1 ? "" : "s"}`);
    await qc.invalidateQueries({ queryKey: ["accounts"] });
    resetImport();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { resetImport(); } }}>
      <Button size="sm" onClick={() => setOpen(true)} className="h-9 gap-1.5">
        <Plus className="h-4 w-4" />
        Add account
      </Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>Create a single account or import many at once.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual entry</TabsTrigger>
            <TabsTrigger value="import">Import file</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="name">Company name <span className="text-risk-critical">*</span></Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="arr">ARR ($)</Label>
                  <Input id="arr" type="number" min={0} value={arr} onChange={(e) => setArr(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="renewal">Days to renewal</Label>
                  <Input id="renewal" type="number" min={0} value={renewal} onChange={(e) => setRenewal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="champion">Champion name</Label>
                  <Input id="champion" value={champion} onChange={(e) => setChampion(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Champion status</Label>
                  <Select value={champStatus} onValueChange={(v) => setChampStatus(v as Account["championStatus"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="quiet">Gone quiet</SelectItem>
                      <SelectItem value="left">Left company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Initial signals</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="login">Last login (days)</Label>
                    <Input id="login" type="number" min={0} value={lastLogin} onChange={(e) => setLastLogin(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reply">Last reply (days)</Label>
                    <Input id="reply" type="number" min={0} value={lastReply} onChange={(e) => setLastReply(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tickets">Open tickets</Label>
                    <Input id="tickets" type="number" min={0} value={tickets} onChange={(e) => setTickets(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ticket sentiment</Label>
                    <Select value={sentiment} onValueChange={(v) => setSentiment(v as AccountSignals["ticketSentiment"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="frustrated">Frustrated</SelectItem>
                        <SelectItem value="angry">Angry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>NPS score</Label>
                      <span className="text-sm font-semibold tabular-nums">{nps[0]}</span>
                    </div>
                    <Slider value={nps} onValueChange={setNps} min={0} max={10} step={1} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Usage trend</Label>
                    <Select value={usage} onValueChange={(v) => setUsage(v as AccountSignals["usageTrend"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="growing">Growing</SelectItem>
                        <SelectItem value="stable">Stable</SelectItem>
                        <SelectItem value="declining">Declining</SelectItem>
                        <SelectItem value="dropped">Dropped significantly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add account
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="import" className="mt-4 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
              }`}
            >
              <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Drop your CSV or JSON file here</p>
              <p className="mt-1 text-xs text-muted-foreground">or</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" />
                Browse file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV template
            </button>

            {parsing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing file…
              </div>
            ) : null}

            {rows.length > 0 && !parsing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="font-semibold">{rows.length}</span> account{rows.length === 1 ? "" : "s"} found
                    {invalidCount > 0 ? (
                      <span className="ml-2 text-risk-critical">· {invalidCount} invalid</span>
                    ) : null}
                  </p>
                  {invalidCount === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-risk-healthy">
                      <CheckCircle2 className="h-4 w-4" /> Ready to import
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-risk-critical">
                      <AlertCircle className="h-4 w-4" /> Fix invalid rows or import valid only
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((c) => (
                          <TableHead key={c} className="whitespace-nowrap text-xs">{c}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 5).map((r, i) => (
                        <TableRow key={i} className={r.errors.length ? "bg-risk-critical/10" : ""}>
                          {columns.map((c) => (
                            <TableCell key={c} className="whitespace-nowrap text-xs">
                              {String(r.raw[c] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {invalidCount > 0 ? (
                  <div className="rounded-md border border-risk-critical/30 bg-risk-critical/10 p-3 text-xs text-risk-critical">
                    {rows.filter((r) => r.errors.length).slice(0, 3).map((r, i) => (
                      <div key={i}>Row {rows.indexOf(r) + 1}: {r.errors.join(", ")}</div>
                    ))}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={resetImport}>Clear</Button>
                  <Button type="button" onClick={handleImport} disabled={importing || validCount === 0}>
                    {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Import {validCount} account{validCount === 1 ? "" : "s"}
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}