import type { DefaultSession } from "next-auth";
declare module "next-auth" { interface Session { user: DefaultSession["user"] & { id: string; role: "USER" | "ADMIN" | "SUPPORT"; credits: number; subscriptionTier: "FREE" | "STARTER" | "PRO" }; } interface User { role?: "USER" | "ADMIN" | "SUPPORT"; creditBalance?: number; subscriptionTier?: "FREE" | "STARTER" | "PRO"; } }
declare module "next-auth/jwt" { interface JWT { role?: "USER" | "ADMIN" | "SUPPORT"; credits?: number; subscriptionTier?: "FREE" | "STARTER" | "PRO"; } }
