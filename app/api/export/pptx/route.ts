import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { DeckSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";
import { consumeExportCredit } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const deck = DeckSchema.parse(await request.json());
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "PitchMyDeck";
    pptx.subject = deck.targetSummary;
    pptx.title = deck.title;
    pptx.company = "PitchMyDeck";
    for (const slide of deck.slides) {
      const page = pptx.addSlide();
      page.background = { color: "0B1020" };
      page.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: (slide.accent ?? "22D3EE").replace("#", "") }, line: { color: "0B1020" } });
      page.addText(slide.title, { x: 0.65, y: 0.7, w: 11.9, h: 0.65, fontFace: "Aptos Display", fontSize: 28, bold: true, color: "F8FAFC", margin: 0 });
      if (slide.subtitle) page.addText(slide.subtitle, { x: 0.67, y: 1.5, w: 11.3, h: 0.45, fontFace: "Aptos", fontSize: 13, color: "94A3B8", margin: 0 });
      if (slide.layout === "quote" && slide.quote) page.addText(`“${slide.quote}”`, { x: 1.1, y: 2.35, w: 10.9, h: 2.1, fontFace: "Aptos Display", fontSize: 25, italic: true, color: "E0F2FE", breakLine: false, valign: "middle", margin: 0 });
      else if (slide.layout === "metrics-grid" && slide.metrics.length) slide.metrics.forEach((metric, i) => { const x = 0.7 + i * 3.1; page.addShape(pptx.ShapeType.roundRect, { x, y: 2.4, w: 2.75, h: 1.8, rectRadius: 0.12, fill: { color: "172554", transparency: 15 }, line: { color: "334155", transparency: 40 } }); page.addText(metric.value, { x: x + 0.25, y: 2.75, w: 2.25, h: 0.4, fontSize: 22, bold: true, color: "FFFFFF", margin: 0 }); page.addText(metric.label, { x: x + 0.25, y: 3.3, w: 2.25, h: 0.3, fontSize: 11, color: "94A3B8", margin: 0 }); });
      else page.addText(slide.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 14 }, hanging: 3 } })), { x: 0.9, y: 2.25, w: 11.1, h: 3.7, fontFace: "Aptos", fontSize: 19, color: "E2E8F0", breakLine: true, paraSpaceAfter: 14, margin: 0.08 });
      if (slide.speakerNotes) page.addNotes(slide.speakerNotes);
    }
    const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
    await consumeExportCredit(user.id);
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename="${deck.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pitchmydeck"}.pptx"` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to export a deck." }, { status: 401 });
    if (message === "INSUFFICIENT_CREDITS") return NextResponse.json({ error: "You need a deck credit to export." }, { status: 402 });
    return NextResponse.json({ error: "Unable to export the supplied deck." }, { status: 400 });
  }
}
