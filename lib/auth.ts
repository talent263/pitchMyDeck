import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(72) });
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma), session: { strategy: "jwt" }, trustHost: true, pages: { signIn: "/signin", verifyRequest: "/signin?checkEmail=1" },
  providers: [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }), GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }), Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_EMAIL_FROM }), Credentials({ name: "Email and password", credentials: { email: {}, password: {} }, async authorize(credentials) { const parsed = credentialsSchema.safeParse(credentials); if (!parsed.success) return null; const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } }); if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null; return { id: user.id, email: user.email, name: user.name, role: user.role as "USER" | "ADMIN" | "SUPPORT", creditBalance: user.creditBalance, subscriptionTier: user.subscriptionTier as "FREE" | "STARTER" | "PRO" }; } })],
  callbacks: { async jwt({ token, user }) { if (user?.id) { token.sub = user.id; token.role = user.role as "USER" | "ADMIN" | "SUPPORT" | undefined; token.credits = user.creditBalance as number | undefined; token.subscriptionTier = user.subscriptionTier as "FREE" | "STARTER" | "PRO" | undefined; } if (token.sub) { const account = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, creditBalance: true, subscriptionTier: true } }); if (account) { token.role = account.role as "USER" | "ADMIN" | "SUPPORT"; token.credits = account.creditBalance as number; token.subscriptionTier = account.subscriptionTier as "FREE" | "STARTER" | "PRO"; } } return token; }, session({ session, token }) { if (session.user && token.sub) { session.user.id = token.sub; session.user.role = (token.role as "USER" | "ADMIN" | "SUPPORT" | undefined) ?? "USER"; session.user.credits = (token.credits as number | undefined) ?? 0; session.user.subscriptionTier = (token.subscriptionTier as "FREE" | "STARTER" | "PRO" | undefined) ?? "FREE"; } return session; } },
});
export async function requireUser() { const session = await auth(); if (!session?.user?.id) throw new Error("UNAUTHORIZED"); return session.user; }
export async function requireRole(...roles: Array<"ADMIN" | "SUPPORT">) { const user = await requireUser(); if (!roles.includes(user.role as "ADMIN" | "SUPPORT")) throw new Error("FORBIDDEN"); return user; }
