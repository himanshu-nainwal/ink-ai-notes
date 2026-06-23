import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Highlighter, PenTool, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartPDF Workspace — Read, annotate, and chat with your PDFs" },
      { name: "description", content: "A focused reading workspace: highlights, handwritten notes, sticky notes, page notebooks, and an AI assistant that knows your document." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-serif text-xl">SmartPDF</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button>Get started</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">A reading workspace</p>
          <h1 className="mt-4 font-serif text-6xl leading-[1.05] text-foreground sm:text-7xl">
            Read deeply.<br/>
            <span className="italic text-primary">Remember everything.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            SmartPDF is the calm place where your PDFs, highlights, drawings, page notes, and an AI study partner all live together — and pick up exactly where you left off.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth"><Button size="lg">Open your library</Button></Link>
            <a href="#features"><Button size="lg" variant="outline">See what's inside</Button></a>
          </div>
        </div>

        <section id="features" className="mt-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Highlighter, title: "Permanent highlights", body: "Four colors, underline, strikethrough — saved to your account, never lost." },
            { icon: PenTool, title: "Handwriting layer", body: "Pen, pencil, marker, highlighter on a canvas above every page." },
            { icon: BookOpen, title: "Page notebooks", body: "Sticky notes anywhere, plus a full notebook for every page." },
            { icon: Sparkles, title: "AI that reads with you", body: "Summarize, explain, flashcards, MCQs — always aware of your current page." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-6 py-8 border-t flex justify-between items-center text-xs text-muted-foreground">
        <p>© SmartPDF Workspace</p>
        <p>Made by Himanshu Nainwal</p>
      </footer>
    </div>
  );
}
