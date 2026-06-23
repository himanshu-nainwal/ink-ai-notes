import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BookOpen, LayoutDashboard, Library, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReader = pathname.startsWith("/reader/");

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  if (isReader) return <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link to="/library" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <span className="font-serif text-lg">SmartPDF</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/library">
              <Button variant={pathname === "/library" ? "secondary" : "ghost"} size="sm">
                <Library className="mr-1.5 h-4 w-4" /> Library
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} size="sm">
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
