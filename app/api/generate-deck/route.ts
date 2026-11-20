import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { DeckSchema, TransformationRequestSchema } from "@/lib/schemas";
import { buildDeckPrompt, deckSystemPrompt } from "@/lib/deck-prompt";
import { extractTargetText } from "@/lib/url-extractor";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI generation is not configured." }, { status: 503 });
    const input = TransformationRequestSchema.parse(await request.json());
    const session = await auth();
    const cookieStore = await cookies();
    if (!session?.user?.id && cookieStore.get("pmd_preview_claimed")) return NextResponse.json({ error: "Your free preview has been used. Create an account to continue." }, { status: 401 });
    const extracted = await extractTargetText(input.targetUrl);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25_000, maxRetries: 1 });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_DECK_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: deckSystemPrompt },
        { role: "user", content: buildDeckPrompt(input, extracted.text) },
      ],
    });
    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("The AI provider returned an empty response.");
    const deck = DeckSchema.parse(JSON.parse(content));
    const response = NextResponse.json({ deck, sourceUrl: extracted.url, previewOnly: !session?.user?.id });
    if (!session?.user?.id) response.cookies.set("pmd_preview_claimed", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request or generated deck structure.", issues: error.flatten() }, { status: 400 });
    if (error instanceof OpenAI.APIError) {
      const status = error.status === 429 ? 429 : 502;
      return NextResponse.json({ error: error.status === 429 ? "Generation is rate limited. Please retry shortly." : "AI generation failed. Please retry." }, { status });
    }
    const message = error instanceof Error ? error.message : "Unable to generate deck.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
