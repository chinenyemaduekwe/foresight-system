import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Activity, Eye, ShieldAlert } from "lucide-react";

import { useAccounts } from "@/hooks/use-accounts";
import { scoreAccount } from "@/data/mockData";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Signal Log", url: "/signals", icon: Activity },
];

function formatArrTotal(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

export function AppSidebar() {
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });
  const { data: accounts } = useAccounts();

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const scored = (accounts ?? []).map((a) => ({ ...a, ...scoreAccount(a) }));
  const total = scored.length;
  const totalArr = scored.reduce((s, a) => s + (a.arr ?? 0), 0);
  const needAttention = scored.filter(
    (a) => a.level === "critical" || a.level === "atrisk",
  ).length;
  const criticalCount = scored.filter((a) => a.level === "critical").length;

  return (
    <Sidebar collapsible="icon" className="sidebar-gradient glass-surface">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-secondary text-secondary-foreground shadow-[0_0_24px_-4px_var(--color-secondary)]">
            <Eye className="relative z-10 h-4 w-4" />
            <div className="animate-glint absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="serif text-[17px] leading-none tracking-tight">Foresight</span>
            <span className="mt-1 text-[10px] italic text-accent">
              Your early warning radar for churn.
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mono text-[10px] uppercase tracking-[0.14em]">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className="data-[active=true]:text-secondary">
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={`Critical (${criticalCount})`}>
                  <Link to="/accounts" className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-risk-critical" />
                    <span>Critical</span>
                    <span className="ml-auto flex items-center gap-1.5 group-data-[collapsible=icon]:hidden">
                      <span className="ripple-badge mono">{criticalCount}</span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="mono text-[10px] uppercase tracking-[0.14em]">
            Portfolio Snapshot
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="mx-2 space-y-2 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 p-3 backdrop-blur">
              <MiniStat label="Total Accounts" value={String(total)} />
              <MiniStat label="Total ARR Tracked" value={formatArrTotal(totalArr)} />
              <MiniStat
                label="Accounts Needing Attention"
                value={String(needAttention)}
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="mono text-[13px] font-medium tabular-nums text-secondary">
        {value}
      </span>
    </div>
  );
}