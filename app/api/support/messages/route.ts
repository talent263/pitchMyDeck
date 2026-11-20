import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
const input = z.object({ message: z.string().trim().min(1).max(1000) });
export async function POST(request: Request) { try { const { message } = input.parse(await request.json()); const user = await auth(); console.info("support_message", { userId: user?.user?.id ?? "guest", length: message.length }); return NextResponse.json({ accepted: true }, { status: 202 }); } catch { return NextResponse.json({ error: "Invalid message." }, { status: 400 }); } }
