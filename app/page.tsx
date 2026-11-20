"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { SlideViewer } from "@/components/SlideViewer";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import type { Deck } from "@/lib/schemas";
import { exportToPptx } from "@/utils/exportToPptx";

export default function Home() {
  const [targetUrl, setTargetUrl] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("Venture capital");
  const [rawContent, setRawContent] = useState("");
  const [deck, setDeck] = useState<Deck>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const generate = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/generate-deck", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUrl, targetIndustry, rawContent }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Generation failed.");
      setDeck(payload.deck); setPreviewOnly(Boolean(payload.previewOnly));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Generation failed."); }
    finally { setLoading(false); }
  };
  return <main className="mx-auto min-h-screen max-w-7xl px-5 py-7 md:px-10"><nav className="mb-16 flex items-center justify-between"><Link href="/" className="font-semibold tracking-tight">Pitch<span className="text-cyan-300">MyDeck</span></Link><div className="flex items-center gap-4 text-sm"><Link href="/pricing" className="text-slate-300 hover:text-white">Pricing</Link><Link href="/signin" className="text-slate-300 hover:text-white">Sign in</Link><Link href="/signup" className="rounded-xl bg-white px-3 py-2 font-medium text-slate-950">Try free</Link></div></nav><header className="mb-10 text-center"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300"><Sparkles size={14} /> Context-aware presentations</div><h1 className="mx-auto max-w-5xl text-4xl font-semibold tracking-tight md:text-7xl">Paste any target URL. Get a tailored presentation made in seconds.</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">Turn rough notes into a sharp deck shaped for the investor, client, grant, or role in front of you.</p></header>
    <form onSubmit={generate} className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-2"><label className="text-sm font-medium">Target URL<input required type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://fund.example.com/thesis" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-400 focus:ring-2" /></label><label className="text-sm font-medium">Target industry<input required value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-400 focus:ring-2" /></label><label className="text-sm font-medium md:col-span-2">Your notes or existing deck text<textarea required minLength={40} value={rawContent} onChange={(e) => setRawContent(e.target.value)} placeholder="Describe the problem, your product, proof points, business model, team, and ask..." className="mt-2 min-h-48 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-400 focus:ring-2" /></label><div className="flex items-center justify-between gap-4 md:col-span-2">{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<button disabled={loading} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">{loading && <LoaderCircle className="animate-spin" size={18} />}{loading ? "Building your deck" : "Generate deck"}</button></div></form>
    <p className="mt-3 text-center text-sm text-slate-400">Preview your tailored deck free. Sign up only to save and export it.</p>
    {deck && <section className="mt-10"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">{deck.title}</h2>{previewOnly && <p className="mt-1 text-sm text-cyan-300">Free preview unlocked — sign in to export your deck.</p>}</div>{previewOnly ? <Link href="/signup" className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Sign up to export</Link> : <button onClick={() => exportToPptx(deck).catch((caught) => setError(caught.message))} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Download PPTX · 1 credit</button>}</div><SlideViewer deck={deck} /></section>}
    <TestimonialsSection /><SupportChatWidget />
  </main>;
}
