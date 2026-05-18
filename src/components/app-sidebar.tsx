import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Activity, Eye, ShieldAlert } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAccounts } from "@/hooks/use-accounts";
import { scoreAccount } from "@/data/mockData";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Signal Log", url: "/signals", icon: Activity },
];

function formatArr(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });
  const { data: accounts } = useAccounts();

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const stats = (() => {
    const list = accounts ?? [];
    let critical = 0;
    let atrisk = 0;
    let arr = 0;
    list.forEach((a) => {
      const { level } = scoreAccount(a);
      arr += a.arr;
      if (level === "critical") critical += 1;
      else if (level === "atrisk") atrisk += 1;
    });
    return { total: list.length, arr, attention: critical + atrisk, critical };
  })();

  return (
    <Sidebar collapsible="icon" className="sidebar-gradient border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Eye className="h-4 w-4" />
            <span className="absolute inset-0 rounded-md ring-1 ring-primary/20 blur-[1px]" />
          </div>
          {!collapsed ? (
            <div className="flex flex-col">
              <span className="font-serif text-base leading-none tracking-tight text-sidebar-foreground">
                Foresight
              </span>
              <span className="mt-1 text-[11px] italic text-muted-foreground">
                Your early warning radar for churn.
              </span>
            </div>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="eyebrow !text-[10px]">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Critical accounts">
                  <Link to="/accounts" className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-risk-critical" />
                    <span>Critical</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {stats.critical > 0 ? (
                        <span className="relative inline-flex">
                          <span className="h-2 w-2 rounded-full bg-risk-critical animate-pulse-ring" />
                        </span>
                      ) : null}
                      <span className="rounded-full bg-risk-critical/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-risk-critical">
                        {stats.critical}
                      </span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed ? (
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="space-y-3 px-2 py-3">
            <div className="eyebrow !text-[10px]">Portfolio</div>
            <div className="space-y-2">
              <SnapshotRow label="Accounts" value={stats.total.toString()} />
              <SnapshotRow label="ARR tracked" value={formatArr(stats.arr)} />
              <SnapshotRow
                label="Need attention"
                value={stats.attention.toString()}
                accent={stats.attention > 0 ? "text-risk-critical" : undefined}
              />
            </div>
          </div>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}

function SnapshotRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-2.5 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs tabular-nums ${accent ?? "text-sidebar-foreground"}`}>
        {value}
      </span>
    </div>
  );
}