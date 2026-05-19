import { Outlet } from "@tanstack/react-router";
import { Search, Bell } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { Toaster } from "@/components/ui/sonner";

export function AppShell() {
  return (
    <SidebarProvider>
      <div className="grain-overlay flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl">
            <SidebarTrigger className="-ml-1" />
            <span className="serif hidden text-[15px] tracking-tight text-foreground sm:inline">
              Foresight
            </span>
            <span className="mono hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              · early warning
            </span>
            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search accounts, signals…"
                className="h-9 border-transparent bg-muted/40 pl-8 focus-visible:bg-background"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <AddAccountDialog />
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">FS</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8">
            <Outlet />
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}