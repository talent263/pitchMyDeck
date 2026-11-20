import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email().max(320), password: z.string().min(10).max(72) });
export async function POST(request: Request) { try { const input = schema.parse(await request.json()); const email = input.email.toLowerCase(); const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } }); if (exists) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 }); const passwordHash = await bcrypt.hash(input.password, 12); await prisma.user.create({ data: { name: input.name, email, passwordHash } }); return NextResponse.json({ ok: true }, { status: 201 }); } catch { return NextResponse.json({ error: "Please provide a valid name, email, and a password of at least 10 characters." }, { status: 400 }); } }
