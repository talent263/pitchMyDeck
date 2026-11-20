"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Minimize, MonitorUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { slideThemes, type Deck, type Slide } from "@/lib/schemas";

type Theme = (typeof slideThemes)[number];
const themeStyles: Record<Theme, { shell: string; accent: string }> = {
  "dark-minimal": { shell: "from-zinc-950 via-zinc-900 to-black text-zinc-100", accent: "bg-white" },
  "modern-tech": { shell: "from-slate-950 via-indigo-950 to-slate-950 text-slate-50", accent: "bg-cyan-400" },
  "corporate-elegant": { shell: "from-slate-900 via-slate-800 to-stone-900 text-stone-50", accent: "bg-amber-300" },
};

function SlideContent({ slide }: { slide: Slide }) {
  const metricGrid = slide.layout === "metrics-grid" && slide.metrics.length > 0;
  return <div className="relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 shadow-2xl backdrop-blur md:p-12">
    <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" style={slide.accent ? { backgroundColor: `${slide.accent}24` } : undefined} />
    <p className="relative mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{slide.layout.replace("-", " ")}</p>
    <h2 className="relative max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">{slide.title}</h2>
    {slide.subtitle && <p className="relative mt-4 max-w-3xl text-base text-white/65 md:text-xl">{slide.subtitle}</p>}
    {slide.layout === "quote" && slide.quote ? <blockquote className="relative my-auto max-w-4xl text-2xl font-medium leading-relaxed md:text-4xl">“{slide.quote}”<footer className="mt-6 text-base font-normal text-white/50">— {slide.quoteAttribution ?? "PitchMyDeck"}</footer></blockquote> : <>
      {metricGrid ? <div className="relative mt-auto grid grid-cols-2 gap-3 pt-8 md:grid-cols-4">{slide.metrics.map((metric) => <div key={metric.label} className="rounded-2xl border border-white/10 bg-black/15 p-4"><strong className="block text-2xl md:text-3xl">{metric.value}</strong><span className="mt-1 block text-sm text-white/60">{metric.label}</span>{metric.context && <small className="mt-2 block text-xs text-white/40">{metric.context}</small>}</div>)}</div> : <div className="relative mt-auto grid gap-3 pt-8 md:grid-cols-2">{slide.bullets.map((bullet) => <p key={bullet} className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-relaxed text-white/80 md:text-base">{bullet}</p>)}</div>}
    </>}
    {slide.visualSuggestion && <p className="relative mt-6 border-l-2 border-cyan-300/70 pl-3 text-xs italic text-white/45">Visual direction: {slide.visualSuggestion}</p>}
  </div>;
}

export function SlideViewer({ deck, initialTheme }: { deck: Deck; initialTheme?: Theme }) {
  const [index, setIndex] = useState(0);
  const [theme, setTheme] = useState<Theme>(initialTheme ?? deck.theme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const go = useCallback((delta: number) => setIndex((current) => Math.max(0, Math.min(deck.slides.length - 1, current + delta))), [deck.slides.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); go(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
      if (event.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
    };
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", onKeyDown); document.addEventListener("fullscreenchange", onFullscreen);
    return () => { window.removeEventListener("keydown", onKeyDown); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, [go]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewerRef.current?.requestFullscreen();
  };
  const slide = deck.slides[index];
  return <section ref={viewerRef} className={`bg-gradient-to-br p-4 md:p-8 ${themeStyles[theme].shell} ${isFullscreen ? "flex min-h-screen items-center" : "rounded-3xl"}`}>
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
        <span>{deck.title} <span className="mx-2 text-white/20">/</span> {index + 1} of {deck.slides.length}</span>
        <div className="flex items-center gap-2"><select aria-label="Presentation theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs text-white outline-none"><option value="dark-minimal">Dark Minimal</option><option value="modern-tech">Modern Tech</option><option value="corporate-elegant">Corporate Elegant</option></select><button onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="rounded-lg border border-white/15 p-2 hover:bg-white/10">{isFullscreen ? <Minimize size={17} /> : <Expand size={17} />}</button></div>
      </div>
      <AnimatePresence mode="wait"><motion.div key={slide.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.24 }}><SlideContent slide={slide} /></motion.div></AnimatePresence>
      <div className="mt-5 flex items-center justify-between"><button onClick={() => go(-1)} disabled={index === 0} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={18} /> Previous</button><div className="flex gap-1">{deck.slides.map((item, itemIndex) => <button key={item.id} onClick={() => setIndex(itemIndex)} aria-label={`Go to slide ${itemIndex + 1}`} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? `w-8 ${themeStyles[theme].accent}` : "w-2 bg-white/25"}`} />)}</div><button onClick={() => go(1)} disabled={index === deck.slides.length - 1} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={18} /></button></div>
    </div>
  </section>;
}

export function PresentDeckButton({ deck }: { deck: Deck }) {
  return <button onClick={() => { const payload = encodeURIComponent(JSON.stringify(deck)); window.open(`/present?deck=${payload}`, "_blank", "noopener,noreferrer"); }} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950"><MonitorUp size={18} /> Present</button>;
}
