import { Outlet } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Search, Bell, LogOut } from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { Toaster } from "@/components/ui/sonner";
import { AnimatedBackground } from "@/components/animated-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function AppShell() {
  const { user, isAuthenticated } = useAuth();
  // Initialise theme (applies .light class to <html> from localStorage)
  useTheme();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "FS";
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };
  return (
    <SidebarProvider>
      <div className="grain-overlay flex min-h-screen w-full bg-background">
        <AnimatedBackground />
        <AppSidebar />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <header className="glass-surface sticky top-0 z-20 flex h-14 items-center gap-3 border-x-0 border-t-0 px-4">
            <HamburgerTrigger />
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
              <ThemeToggle />
              <AddAccountDialog />
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>
              {isAuthenticated ? (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleSignOut}
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button asChild size="sm" variant="outline" className="h-9">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
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

function HamburgerTrigger() {
  const { openMobile, setOpenMobile, isMobile, toggleSidebar, open } = useSidebar();
  const isOpen = isMobile ? openMobile : open;
  const onClick = () => {
    if (isMobile) setOpenMobile(!openMobile);
    else toggleSidebar();
  };
  return (
    <button
      type="button"
      aria-label="Toggle navigation"
      aria-expanded={isOpen}
      onClick={onClick}
      className="hamburger-btn -ml-1"
      data-open={isOpen ? "true" : "false"}
    >
      <span className="hamburger-bar hamburger-bar-1" />
      <span className="hamburger-bar hamburger-bar-2" />
      <span className="hamburger-bar hamburger-bar-3" />
    </button>
  );
}