import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, FileText, Star, Archive, Search, Trash2, ArchiveRestore } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library · SmartPDF" }] }),
  component: LibraryPage,
});

type Pdf = {
  id: string;
  title: string;
  storage_path: string;
  page_count: number;
  last_page: number;
  is_favorite: boolean;
  is_archived: boolean;
  last_opened_at: string;
  file_size: number;
};

function LibraryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: pdfs = [], isLoading } = useQuery({
    queryKey: ["pdfs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdfs")
        .select("*")
        .order("last_opened_at", { ascending: false });
      if (error) throw error;
      return data as Pdf[];
    },
  });

  const onUpload = async (file: File) => {
    if (!file.type.includes("pdf")) { toast.error("Please choose a PDF file"); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pdfs").upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("pdfs").insert({
        user_id: uid,
        title: file.name.replace(/\.pdf$/i, ""),
        storage_path: path,
        file_size: file.size,
      });
      if (insErr) throw insErr;
      toast.success("PDF uploaded");
      qc.invalidateQueries({ queryKey: ["pdfs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleFav = async (p: Pdf) => {
    await supabase.from("pdfs").update({ is_favorite: !p.is_favorite }).eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["pdfs"] });
  };
  const toggleArchive = async (p: Pdf) => {
    await supabase.from("pdfs").update({ is_archived: !p.is_archived }).eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["pdfs"] });
  };
  const remove = async (p: Pdf) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await supabase.storage.from("pdfs").remove([p.storage_path as any]);
    await supabase.from("pdfs").delete().eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["pdfs"] });
  };

  const filterBy = (which: "all" | "favorite" | "archived" | "recent") => {
    let list = pdfs.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
    if (which === "favorite") return list.filter(p => p.is_favorite && !p.is_archived);
    if (which === "archived") return list.filter(p => p.is_archived);
    if (which === "recent") return list.filter(p => !p.is_archived).slice(0, 8);
    return list.filter(p => !p.is_archived);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Your library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload a PDF and start reading — annotations save automatically.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search PDFs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1.5 h-4 w-4" /> {uploading ? "Uploading…" : "Upload PDF"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mt-8">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="favorite">Favorites</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        {(["all", "recent", "favorite", "archived"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filterBy(k).length === 0 ? (
              <Card className="grid place-items-center p-16 border-dashed">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium">No PDFs here yet</p>
                <p className="text-sm text-muted-foreground">Upload your first document to get started.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filterBy(k).map((p) => (
                  <Card key={p.id} className="group overflow-hidden p-0">
                    <Link to="/reader/$pdfId" params={{ pdfId: p.id }} className="block">
                      <div className="grid aspect-[3/4] place-items-center bg-secondary">
                        <FileText className="h-16 w-16 text-muted-foreground/40" />
                      </div>
                    </Link>
                    <div className="space-y-1 p-4">
                      <Link to="/reader/$pdfId" params={{ pdfId: p.id }} className="line-clamp-2 font-medium hover:text-primary">
                        {p.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.page_count > 0 && `Page ${p.last_page}/${p.page_count} · `}
                        {formatDistanceToNow(new Date(p.last_opened_at))} ago
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <Button size="sm" variant="ghost" onClick={() => toggleFav(p)}>
                          <Star className={`h-4 w-4 ${p.is_favorite ? "fill-primary text-primary" : ""}`} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleArchive(p)}>
                          {p.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
