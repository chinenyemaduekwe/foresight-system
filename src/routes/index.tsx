import { createFileRoute } from "@tanstack/react-router";
import { mockAccounts, scoreAccount } from "@/data/mockData";

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
  const scored = mockAccounts.map((a) => ({ ...a, ...scoreAccount(a) }));
  const critical = scored.filter((a) => a.level === "critical").length;
  const atrisk = scored.filter((a) => a.level === "atrisk").length;
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Tracking {mockAccounts.length} accounts — {critical} critical, {atrisk} at risk.
      </p>
    </div>
  );
}
