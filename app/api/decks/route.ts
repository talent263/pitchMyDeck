import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { DeckSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
export async function GET() { try { const user = await requireUser(); const decks = await prisma.deck.findMany({ where: { userId: user.id }, select: { id: true, title: true, createdAt: true }, orderBy: { createdAt: "desc" } }); return NextResponse.json({ decks }); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); } }
const saveSchema = z.object({ deck: DeckSchema });
export async function POST(request: Request) { try { const user = await requireUser(); const { deck } = saveSchema.parse(await request.json()); const saved = await prisma.deck.create({ data: { userId: user.id, title: deck.title, content: deck } }); return NextResponse.json({ id: saved.id }, { status: 201 }); } catch { return NextResponse.json({ error: "Unable to save deck." }, { status: 400 }); } }
