import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            messages: ChatMsg[];
            context?: { pdfTitle?: string; page?: number; pageText?: string };
          };
          const key = process.env.GEMINI_API_KEY;
          if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

          const ctx = body.context ?? {};
          const system = `You are SmartPDF's reading assistant. The user is reading "${ctx.pdfTitle ?? "a PDF"}" and is currently on page ${ctx.page ?? "?"}.
You can summarize, explain in simple language, generate flashcards/MCQs, translate, and answer questions about the text below.
Be concise and helpful. Use markdown only when it improves clarity (lists, bold key terms). If the page text is empty, say you cannot see the page text and ask the user to share what they need.

--- BEGIN CURRENT PAGE TEXT ---
${(ctx.pageText ?? "").slice(0, 8000)}
--- END CURRENT PAGE TEXT ---`;

          const messages = [
            { role: "system", content: system },
            ...body.messages.slice(-20),
          ];

          const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "gemini-2.5-flash",
              messages,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            return new Response(t || `Upstream error ${res.status}`, { status: res.status });
          }
          const j = await res.json();
          const text = j.choices?.[0]?.message?.content ?? "";
          return Response.json({ text });
        } catch (e: any) {
          return new Response(e?.message ?? "AI route failed", { status: 500 });
        }
      },
    },
  },
});
