import { createFileRoute } from "@tanstack/react-router";
import { scoreAccount } from "@/data/mockData";
import { useAccounts } from "@/hooks/use-accounts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Foresight" },
      { name: "description", content: "Health overview across your customer portfolio." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: accounts, isLoading, error } = useAccounts();
  const scored = (accounts ?? []).map((a) => ({ ...a, ...scoreAccount(a) }));
  const critical = scored.filter((a) => a.level === "critical").length;
  const atrisk = scored.filter((a) => a.level === "atrisk").length;
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Loading accounts…"
          : error
            ? "Failed to load accounts."
            : `Tracking ${scored.length} accounts — ${critical} critical, ${atrisk} at risk.`}
      </p>
    </div>
  );
}
