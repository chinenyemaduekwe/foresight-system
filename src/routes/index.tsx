import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Your customer health overview will appear here.
      </p>
    </div>
  );
}
