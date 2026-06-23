import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Stroke = { points: { x: number; y: number }[]; color: string; width: number };

export function DrawingLayer({
  pdfId, page, active, mode, initialStrokes, onChange,
}: {
  pdfId: string; page: number; active: boolean; mode: "draw" | "erase";
  initialStrokes: Stroke[]; onChange: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [current, setCurrent] = useState<Stroke | null>(null);

  useEffect(() => { setStrokes(initialStrokes); }, [initialStrokes]);

  const persist = async (next: Stroke[]) => {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("drawings").upsert(
      { pdf_id: pdfId, page, user_id: u.user!.id, strokes: next as any, updated_at: new Date().toISOString() },
      { onConflict: "pdf_id,page" },
    );
    onChange();
  };

  const getPt = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!active) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    if (mode === "draw") {
      setCurrent({ points: [getPt(e)], color: "oklch(0.55 0.15 35)", width: 2.5 });
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!active) return;
    if (mode === "draw" && current) {
      setCurrent({ ...current, points: [...current.points, getPt(e)] });
    } else if (mode === "erase" && (e.buttons & 1)) {
      const pt = getPt(e);
      const next = strokes.filter(s => !s.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < 0.015));
      if (next.length !== strokes.length) { setStrokes(next); persist(next); }
    }
  };
  const onUp = () => {
    if (current && current.points.length > 1) {
      const next = [...strokes, current];
      setStrokes(next); persist(next);
    }
    setCurrent(null);
  };

  const toPath = (s: Stroke) => {
    if (!s.points.length) return "";
    const w = svgRef.current?.clientWidth ?? 1;
    const h = svgRef.current?.clientHeight ?? 1;
    return s.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x * w} ${p.y * h}`).join(" ");
  };

  return (
    <svg ref={svgRef}
      className="absolute inset-0 h-full w-full z-10"
      style={{ pointerEvents: active ? "auto" : "none", touchAction: active ? "none" : undefined, cursor: active ? (mode === "erase" ? "cell" : "crosshair") : undefined }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
    >
      {strokes.map((s, i) => (
        <path key={i} d={toPath(s)} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {current && (
        <path d={toPath(current)} fill="none" stroke={current.color} strokeWidth={current.width} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
