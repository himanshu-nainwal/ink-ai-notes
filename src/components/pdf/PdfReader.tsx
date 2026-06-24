import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Highlighter,
  PenTool, Sparkles, Bookmark, StickyNote, NotebookPen, X, Eraser, Trash2,
  Rows, BookOpen
} from "lucide-react";
import { AiPanel } from "./AiPanel";
import { DrawingLayer } from "./DrawingLayer";
import { StudyTimer } from "./StudyTimer";

// Configure pdf.js worker (browser-only)
if (typeof window !== "undefined") {
  // @ts-ignore - vite ?url import
  import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => {
    pdfjs.GlobalWorkerOptions.workerSrc = m.default;
  });
}

const HL_COLORS: Record<string, string> = {
  yellow: "var(--hl-yellow)",
  green: "var(--hl-green)",
  blue: "var(--hl-blue)",
  pink: "var(--hl-pink)",
};

type Tool = "select" | "highlight" | "underline" | "strike" | "draw" | "erase" | "sticky";

export function PdfReader({ pdfId }: { pdfId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [tool, setTool] = useState<Tool>("select");
  const [hlColor, setHlColor] = useState("yellow");
  const [aiOpen, setAiOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("notes");
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [currentPageText, setCurrentPageText] = useState("");
  const [layoutMode, setLayoutMode] = useState<"vertical" | "horizontal">("vertical");

  // Load PDF metadata + signed URL
  const { data: pdfMeta } = useQuery({
    queryKey: ["pdf", pdfId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pdfs").select("*").eq("id", pdfId).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!pdfMeta) return;
    setPage(pdfMeta.last_page || 1);
    setZoom(pdfMeta.last_zoom || 1.2);
    (async () => {
      const { data, error } = await supabase.storage.from("pdfs").createSignedUrl(pdfMeta.storage_path, 3600);
      if (error) toast.error(error.message);
      else setFileUrl(data.signedUrl);
    })();
  }, [pdfMeta]);

  // Persist last_page / last_zoom (debounced)
  useEffect(() => {
    if (!pdfMeta) return;
    const t = setTimeout(() => {
      supabase.from("pdfs").update({
        last_page: page, last_zoom: zoom, last_opened_at: new Date().toISOString(),
      }).eq("id", pdfId);
    }, 600);
    return () => clearTimeout(t);
  }, [page, zoom, pdfMeta, pdfId]);

  // Global bookmarks & pagenote for current active page
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks", pdfId],
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks").select("*").eq("pdf_id", pdfId).order("page");
      return data ?? [];
    },
  });

  const { data: pageNote } = useQuery({
    queryKey: ["pagenote", pdfId, page],
    queryFn: async () => {
      const { data } = await supabase.from("page_notes").select("*").eq("pdf_id", pdfId).eq("page", page).maybeSingle();
      return data;
    },
  });

  // Page note autosave
  const [noteDraft, setNoteDraft] = useState("");
  useEffect(() => { setNoteDraft(pageNote?.content ?? ""); }, [pageNote, page]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!pdfMeta) return;
      if ((pageNote?.content ?? "") === noteDraft) return;
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("page_notes").upsert(
        { pdf_id: pdfId, page, user_id: u.user!.id, content: noteDraft, updated_at: new Date().toISOString() },
        { onConflict: "pdf_id,page" },
      );
      qc.invalidateQueries({ queryKey: ["pagenote", pdfId, page] });
    }, 800);
    return () => clearTimeout(t);
  }, [noteDraft, pdfId, page, pageNote, pdfMeta, qc]);

  // Intersection Observer to track visible page in Vertical Mode
  useEffect(() => {
    if (layoutMode !== "vertical" || pageCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const pNum = Number((visible[0].target as HTMLElement).dataset.page);
          if (pNum && pNum !== page) {
            setPage(pNum);
          }
        }
      },
      { threshold: 0.2, rootMargin: "-15% 0px -15% 0px" }
    );

    const elements = document.querySelectorAll("[data-page]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [layoutMode, pageCount, zoom, page]);

  const addBookmark = async () => {
    const label = prompt("Bookmark label:", `Page ${page}`);
    if (!label) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("bookmarks").insert({ user_id: u.user!.id, pdf_id: pdfId, page, label });
    qc.invalidateQueries({ queryKey: ["bookmarks", pdfId] });
    toast.success("Bookmark added");
  };

  // Extract page text for AI context
  const onPageLoad = useCallback(async (p: any) => {
    try {
      const tc = await p.getTextContent();
      const text = tc.items.map((i: any) => i.str).join(" ");
      setCurrentPageText(text);
      setPageSize({ w: p.width, h: p.height });
    } catch {}
  }, []);

  const onDocLoad = (pdf: { numPages: number }) => {
    setPageCount(pdf.numPages);
    if (pdfMeta && pdfMeta.page_count !== pdf.numPages) {
      supabase.from("pdfs").update({ page_count: pdf.numPages }).eq("id", pdfId);
    }
  };

  const scrollToPage = (pNum: number) => {
    const el = document.querySelector(`[data-page="${pNum}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePageChange = (newPage: number) => {
    const v = Math.max(1, Math.min(pageCount || 1, newPage));
    setPage(v);
    if (layoutMode === "vertical") {
      scrollToPage(v);
    }
  };

  const goPrev = () => handlePageChange(page - 1);
  const goNext = () => handlePageChange(page + 1);

  const docFile = useMemo(() => fileUrl ? { url: fileUrl } : null, [fileUrl]);

  // Highlights on current active page for sidebar list
  const { data: activePageHighlights = [] } = useQuery({
    queryKey: ["highlights", pdfId, page],
    queryFn: async () => {
      const { data } = await supabase.from("highlights").select("*").eq("pdf_id", pdfId).eq("page", page);
      return data ?? [];
    },
  });

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/library" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="line-clamp-1 max-w-[24ch] font-medium">{pdfMeta?.title ?? "Loading…"}</span>
        <div className="mx-2 h-5 w-px bg-border" />

        <Button variant="ghost" size="sm" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="number" value={page} min={1} max={pageCount || undefined}
          onChange={(e) => handlePageChange(+e.target.value || 1)}
          className="h-8 w-16 text-center" />
        <span className="text-sm text-muted-foreground">/ {pageCount || "—"}</span>
        <Button variant="ghost" size="sm" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>

        <div className="mx-2 h-5 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}><ZoomOut className="h-4 w-4" /></Button>
        <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))}><ZoomIn className="h-4 w-4" /></Button>

        <div className="mx-2 h-5 w-px bg-border" />
        {/* Layout Mode Toggle */}
        <Button variant={layoutMode === "vertical" ? "secondary" : "ghost"} size="sm" onClick={() => setLayoutMode("vertical")} title="Continuous Scroll (Vertical)">
          <Rows className="h-4 w-4" />
        </Button>
        <Button variant={layoutMode === "horizontal" ? "secondary" : "ghost"} size="sm" onClick={() => setLayoutMode("horizontal")} title="Single Page (Horizontal)">
          <BookOpen className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-5 w-px bg-border" />
        {/* Tools */}
        <ToolBtn active={tool === "highlight"} onClick={() => setTool(tool === "highlight" ? "select" : "highlight")} icon={Highlighter} title="Highlight" />
        <ToolBtn active={tool === "draw"} onClick={() => setTool(tool === "draw" ? "select" : "draw")} icon={PenTool} title="Draw" />
        <ToolBtn active={tool === "sticky"} onClick={() => setTool(tool === "sticky" ? "select" : "sticky")} icon={StickyNote} title="Sticky note" />
        <ToolBtn active={tool === "erase"} onClick={() => setTool(tool === "erase" ? "select" : "erase")} icon={Eraser} title="Eraser" />

        {tool === "highlight" && (
          <div className="ml-1 flex items-center gap-1">
            {Object.keys(HL_COLORS).map(c => (
              <button key={c} onClick={() => setHlColor(c)}
                className={`h-5 w-5 rounded-full border-2 ${hlColor === c ? "border-foreground" : "border-transparent"}`}
                style={{ background: HL_COLORS[c] }} aria-label={c} />
            ))}
          </div>
        )}

        <div className="mx-2 h-5 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={addBookmark}><Bookmark className="h-4 w-4" /></Button>

        <div className="ml-auto flex items-center gap-2">
          <StudyTimer pdfId={pdfId} />
          <Button variant={aiOpen ? "secondary" : "ghost"} size="sm" onClick={() => setAiOpen(v => !v)}>
            <Sparkles className="mr-1.5 h-4 w-4" /> AI
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-72 shrink-0 border-r bg-card">
          <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex h-full flex-col">
            <TabsList className="m-2">
              <TabsTrigger value="notes" className="flex-1"><NotebookPen className="mr-1 h-3.5 w-3.5" />Notes</TabsTrigger>
              <TabsTrigger value="highlights" className="flex-1"><Highlighter className="mr-1 h-3.5 w-3.5" />Highlights</TabsTrigger>
              <TabsTrigger value="bookmarks" className="flex-1"><Bookmark className="mr-1 h-3.5 w-3.5" />Marks</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="flex-1 px-3 pb-3 mt-0">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Page {page} notebook</p>
              <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write notes for this page… (autosaves)"
                className="h-[calc(100vh-180px)] resize-none" />
            </TabsContent>
            <TabsContent value="highlights" className="flex-1 px-2 pb-3 mt-0">
              <ScrollArea className="h-[calc(100vh-160px)]">
                {activePageHighlights.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground">No highlights on this page yet.</p>
                ) : (
                  activePageHighlights.map((h: any) => (
                    <div key={h.id} className="flex items-start justify-between gap-2 rounded px-2 py-2 hover:bg-accent group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2 italic text-foreground bg-accent/30 px-1.5 py-1 rounded border-l-2" style={{ borderLeftColor: HL_COLORS[h.color] || HL_COLORS.yellow }}>
                          "{h.selected_text}"
                        </p>
                      </div>
                      <button onClick={async () => {
                        await supabase.from("highlights").delete().eq("id", h.id);
                        qc.invalidateQueries({ queryKey: ["highlights", pdfId, page] });
                        toast.success("Highlight deleted");
                      }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  ))
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="bookmarks" className="flex-1 px-2 pb-3 mt-0">
              <ScrollArea className="h-[calc(100vh-160px)]">
                {bookmarks.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground">No bookmarks yet. Use the bookmark button to add one.</p>
                ) : (
                  bookmarks.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                      <button onClick={() => handlePageChange(b.page)} className="flex-1 text-left text-sm">
                        <span className="font-medium">{b.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">p.{b.page}</span>
                      </button>
                      <button onClick={async () => {
                        await supabase.from("bookmarks").delete().eq("id", b.id);
                        qc.invalidateQueries({ queryKey: ["bookmarks", pdfId] });
                      }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </div>
                  ))
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Page area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100/50">
          {!docFile ? (
            <div className="grid h-full place-items-center text-muted-foreground">Preparing document…</div>
          ) : (
            <Document file={docFile} onLoadSuccess={onDocLoad}
              loading={<div className="grid h-full place-items-center text-muted-foreground">Loading PDF…</div>}
              error={<div className="grid h-full place-items-center text-destructive">Failed to load PDF</div>}>
              
              {layoutMode === "vertical" ? (
                <div className="flex flex-col gap-6">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((pNum) => {
                    // Only render pages near the active page window to prevent high canvas memory usage
                    const isRendered = Math.abs(pNum - page) <= 3;
                    if (isRendered) {
                      return (
                        <PdfPageView
                          key={pNum}
                          pdfId={pdfId}
                          pNum={pNum}
                          zoom={zoom}
                          tool={tool}
                          hlColor={hlColor}
                          pageSize={pageSize}
                          onPageLoad={pNum === page ? onPageLoad : () => {}}
                          qc={qc}
                        />
                      );
                    }
                    return (
                      <div
                        key={pNum}
                        data-page={pNum}
                        className="mx-auto border bg-card my-4 shadow-sm flex items-center justify-center text-muted-foreground rounded-lg"
                        style={{
                          width: pageSize.w ? pageSize.w * zoom : "100%",
                          height: pageSize.h ? pageSize.h * zoom : 800,
                        }}
                      >
                        Scrolling to Page {pNum}...
                      </div>
                    );
                  })}
                </div>
              ) : (
                <PdfPageView
                  pdfId={pdfId}
                  pNum={page}
                  zoom={zoom}
                  tool={tool}
                  hlColor={hlColor}
                  pageSize={pageSize}
                  onPageLoad={onPageLoad}
                  qc={qc}
                />
              )}
            </Document>
          )}
        </div>

        {/* AI panel */}
        {aiOpen && (
          <aside className="w-96 shrink-0 border-l bg-card">
            <AiPanel pdfId={pdfId} pdfTitle={pdfMeta?.title ?? ""} page={page} pageText={currentPageText} onClose={() => setAiOpen(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, icon: Icon, title }: any) {
  return (
    <Button variant={active ? "secondary" : "ghost"} size="sm" onClick={onClick} title={title}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

interface PdfPageViewProps {
  pdfId: string;
  pNum: number;
  zoom: number;
  tool: Tool;
  hlColor: string;
  pageSize: { w: number; h: number };
  onPageLoad: (p: any) => void;
  qc: any;
}

function PdfPageView({ pdfId, pNum, zoom, tool, hlColor, pageSize, onPageLoad, qc }: PdfPageViewProps) {
  const { data: highlights = [] } = useQuery({
    queryKey: ["highlights", pdfId, pNum],
    queryFn: async () => {
      const { data } = await supabase.from("highlights").select("*").eq("pdf_id", pdfId).eq("page", pNum);
      return data ?? [];
    },
  });

  const { data: stickies = [] } = useQuery({
    queryKey: ["sticky", pdfId, pNum],
    queryFn: async () => {
      const { data } = await supabase.from("sticky_notes").select("*").eq("pdf_id", pdfId).eq("page", pNum);
      return data ?? [];
    },
  });

  const { data: drawing } = useQuery({
    queryKey: ["drawing", pdfId, pNum],
    queryFn: async () => {
      const { data } = await supabase.from("drawings").select("*").eq("pdf_id", pdfId).eq("page", pNum).maybeSingle();
      return data;
    },
  });

  const onMouseUp = useCallback(async () => {
    if (!["highlight", "underline", "strike"].includes(tool)) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = sel.toString();
    if (!text.trim()) return;

    const pageEl = document.querySelector(`[data-page="${pNum}"]`);
    if (!pageEl) return;

    const wrapRect = pageEl.getBoundingClientRect();
    const rects = Array.from(range.getClientRects()).map((r) => ({
      x: (r.left - wrapRect.left) / wrapRect.width,
      y: (r.top - wrapRect.top) / wrapRect.height,
      width: r.width / wrapRect.width,
      height: r.height / wrapRect.height,
    }));
    if (!rects.length) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("highlights").insert({
      user_id: u.user!.id, pdf_id: pdfId, page: pNum,
      color: hlColor,
      style: tool === "highlight" ? "highlight" : tool === "underline" ? "underline" : "strikethrough",
      selected_text: text, rects: rects as any,
    });
    sel.removeAllRanges();
    qc.invalidateQueries({ queryKey: ["highlights", pdfId, pNum] });
  }, [tool, hlColor, pdfId, pNum, qc]);

  const addSticky = async (e: React.MouseEvent) => {
    if (tool !== "sticky") return;
    const pageEl = document.querySelector(`[data-page="${pNum}"]`);
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("sticky_notes").insert({
      user_id: u.user!.id, pdf_id: pdfId, page: pNum, x, y, content: "",
    });
    qc.invalidateQueries({ queryKey: ["sticky", pdfId, pNum] });
  };

  return (
    <div
      data-page={pNum}
      className="pdf-page-shell relative mx-auto shadow-md border bg-card my-4 rounded-lg"
      style={{
        width: pageSize.w ? pageSize.w * zoom : undefined,
        height: pageSize.h ? pageSize.h * zoom : undefined,
        cursor: tool === "sticky" ? "crosshair" : undefined,
      }}
      onMouseUp={onMouseUp}
      onClick={addSticky}
    >
      <Page pageNumber={pNum} scale={zoom} onLoadSuccess={onPageLoad}
        renderAnnotationLayer={false} renderTextLayer={true}
        loading={<div style={{ height: pageSize.h ? pageSize.h * zoom : 800 }} className="grid place-items-center bg-muted text-muted-foreground">Loading Page {pNum}...</div>}
      />

      {/* Highlight overlays */}
      {highlights.map((h: any) => (
        <div key={h.id} className="pointer-events-none absolute inset-0">
          {h.rects.map((r: any, i: number) => (
            <div key={i} className="absolute pointer-events-auto"
              title={h.selected_text}
              onDoubleClick={async () => {
                if (confirm("Delete this highlight?")) {
                  await supabase.from("highlights").delete().eq("id", h.id);
                  qc.invalidateQueries({ queryKey: ["highlights", pdfId, pNum] });
                }
              }}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.width * 100}%`,
                height: `${r.height * 100}%`,
                background: h.style === "highlight" ? `color-mix(in oklab, ${HL_COLORS[h.color] || HL_COLORS.yellow} 55%, transparent)` : "transparent",
                borderBottom: h.style === "underline" ? `2px solid ${HL_COLORS[h.color] || HL_COLORS.yellow}` : undefined,
                textDecoration: h.style === "strikethrough" ? "line-through" : undefined,
                mixBlendMode: h.style === "highlight" ? "multiply" : undefined,
              }} />
          ))}
        </div>
      ))}

      {/* Drawing layer */}
      <DrawingLayer
        pdfId={pdfId} page={pNum} active={tool === "draw" || tool === "erase"} mode={tool === "erase" ? "erase" : "draw"}
        initialStrokes={(drawing?.strokes as any) ?? []}
        onChange={() => qc.invalidateQueries({ queryKey: ["drawing", pdfId, pNum] })}
      />

      {/* Stickies */}
      {stickies.map((s: any) => (
        <StickyView key={s.id} sticky={s} onUpdate={() => qc.invalidateQueries({ queryKey: ["sticky", pdfId, pNum] })} />
      ))}
    </div>
  );
}

function StickyView({ sticky, onUpdate }: { sticky: any; onUpdate: () => void }) {
  const [content, setContent] = useState(sticky.content);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (content !== sticky.content) {
        await supabase.from("sticky_notes").update({ content, updated_at: new Date().toISOString() }).eq("id", sticky.id);
        onUpdate();
      }
    }, 600);
    return () => clearTimeout(t);
  }, [content, sticky, onUpdate]);

  return (
    <div className="sticky-note" style={{ left: `${sticky.x * 100}%`, top: `${sticky.y * 100}%` }} onClick={(e) => e.stopPropagation()}>
      <Textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write note..."
        className="w-full h-full resize-none border-none bg-transparent p-0 pr-6 pt-1 text-xs shadow-none focus-visible:ring-0 focus-visible:outline-none focus:outline-none text-black placeholder:text-black/40 min-h-0" 
      />
      <button 
        onClick={async (e) => { 
          e.stopPropagation();
          await supabase.from("sticky_notes").delete().eq("id", sticky.id); 
          onUpdate(); 
        }}
        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/5 hover:bg-red-500 hover:text-white text-black/50 transition-colors cursor-pointer z-20 shadow-sm"
        title="Delete note"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
