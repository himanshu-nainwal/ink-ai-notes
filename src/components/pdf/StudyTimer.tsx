import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function StudyTimer({ pdfId }: { pdfId: string }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<Date | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (interval.current) {
      clearInterval(interval.current);
    }
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [running]);

  const start = () => { startedAt.current = new Date(); setRunning(true); };
  const pause = () => setRunning(false);
  const stop = async () => {
    setRunning(false);
    if (seconds > 5 && startedAt.current) {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("study_sessions").insert({
        user_id: u.user!.id, pdf_id: pdfId, mode: "focus",
        duration_seconds: seconds, started_at: startedAt.current.toISOString(),
        ended_at: new Date().toISOString(),
      });
    }
    setSeconds(0);
    startedAt.current = null;
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-1 rounded-md border bg-secondary px-2 py-1">
      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="tabular-nums text-sm">{fmt(seconds)}</span>
      {!running ? (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={start}><Play className="h-3 w-3" /></Button>
      ) : (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={pause}><Pause className="h-3 w-3" /></Button>
      )}
      {seconds > 0 && (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={stop}><Square className="h-3 w-3" /></Button>
      )}
    </div>
  );
}
