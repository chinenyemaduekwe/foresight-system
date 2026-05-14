import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — Foresight" },
      { name: "description", content: "Browse and triage customer accounts." },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
      <p className="text-sm text-muted-foreground">
        Account list and risk scores will appear here.
      </p>
    </div>
  );
}