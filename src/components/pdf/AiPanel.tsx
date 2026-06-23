import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, X, FileText, ListChecks, Languages } from "lucide-react";
import { toast } from "sonner";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

export function AiPanel({ pdfId, pdfTitle, page, pageText, onClose }: {
  pdfId: string; pdfTitle: string; page: number; pageText: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat", pdfId],
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("pdf_id", pdfId).order("created_at");
      return (data ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })) as Msg[];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");
    try {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("chat_messages").insert({
        user_id: u.user!.id, pdf_id: pdfId, role: "user", content: text, page_context: page,
      });
      qc.invalidateQueries({ queryKey: ["chat", pdfId] });

      const history = [...messages, { role: "user" as const, content: text }];
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          context: { pdfTitle, page, pageText: pageText.slice(0, 8000) },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `AI error ${res.status}`);
      }
      const j = await res.json();
      const reply = j.text ?? "(no response)";
      await supabase.from("chat_messages").insert({
        user_id: u.user!.id, pdf_id: pdfId, role: "assistant", content: reply, page_context: page,
      });
      qc.invalidateQueries({ queryKey: ["chat", pdfId] });
    } catch (e: any) {
      toast.error(e.message ?? "AI failed");
    } finally {
      setSending(false);
    }
  };

  const quick = (label: string, prompt: string, Icon: any) => (
    <button onClick={() => send(prompt)} disabled={sending}
      className="flex items-center gap-1.5 rounded-md border bg-secondary px-2 py-1 text-xs hover:bg-accent">
      <Icon className="h-3 w-3" /> {label}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">AI Assistant</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b p-3">
        {quick("Summarize page", `Summarize page ${page} clearly and concisely.`, FileText)}
        {quick("Explain simply", `Explain the content of page ${page} in simple language.`, Sparkles)}
        {quick("Flashcards", `Create 5 flashcards (Q + A) from page ${page}.`, ListChecks)}
        {quick("MCQs", `Generate 4 multiple-choice questions from page ${page} with answers.`, ListChecks)}
        {quick("Translate", `Translate the content of page ${page} to English (or to French if already English).`, Languages)}
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-3 p-3">
          {messages.length === 0 && !sending && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Ask anything about <span className="font-medium text-foreground">{pdfTitle}</span>. I know what page you're on.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={m.id ?? i} className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>
              <div className="space-y-1.5 leading-relaxed">{renderMarkdown(m.content)}</div>
            </div>
          ))}
          {sending && (
            <div className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">Thinking…</div>
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2 border-t p-3"
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask about page ${page}…`} disabled={sending} />
        <Button type="submit" size="sm" disabled={sending}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    let isBullet = false;
    let cleanLine = line;
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      isBullet = true;
      cleanLine = line.replace(/^\s*[\*\-]\s+/, "");
    }
    const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
    const content = parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={partIdx} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    if (isBullet) {
      return (
        <div key={lineIdx} className="flex gap-2 pl-3 py-0.5">
          <span className="text-muted-foreground select-none">•</span>
          <span className="flex-1">{content}</span>
        </div>
      );
    }
    return (
      <p key={lineIdx} className={cleanLine.trim() === "" ? "h-2" : ""}>
        {content}
      </p>
    );
  });
}

