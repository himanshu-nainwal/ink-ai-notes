import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BookOpen, Highlighter, NotebookPen, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · SmartPDF" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [pdfs, hl, notes, sess] = await Promise.all([
        supabase.from("pdfs").select("id,page_count,last_page", { count: "exact" }),
        supabase.from("highlights").select("id", { count: "exact", head: true }),
        supabase.from("page_notes").select("id", { count: "exact", head: true }),
        supabase.from("study_sessions").select("duration_seconds"),
      ]);
      const totalSeconds = (sess.data ?? []).reduce((a, s: any) => a + (s.duration_seconds || 0), 0);
      const pagesRead = (pdfs.data ?? []).reduce((a, p: any) => a + (p.last_page || 0), 0);
      return {
        pdfCount: pdfs.count ?? 0,
        highlightCount: hl.count ?? 0,
        noteCount: notes.count ?? 0,
        hours: (totalSeconds / 3600).toFixed(1),
        pagesRead,
      };
    },
  });

  const cards = [
    { label: "PDFs in library", value: stats?.pdfCount ?? 0, icon: BookOpen },
    { label: "Pages read", value: stats?.pagesRead ?? 0, icon: BookOpen },
    { label: "Highlights", value: stats?.highlightCount ?? 0, icon: Highlighter },
    { label: "Page notes", value: stats?.noteCount ?? 0, icon: NotebookPen },
    { label: "Hours studied", value: stats?.hours ?? "0.0", icon: Clock },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="font-serif text-4xl">Reading dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your progress across all documents.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-serif">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
