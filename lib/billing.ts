import { randomUUID, timingSafeEqual, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const products = {
  starter: { kind: "subscription", tier: "STARTER", priceId: process.env.STRIPE_STARTER_PRICE_ID, amountCents: 1200, credits: 10 },
  pro: { kind: "subscription", tier: "PRO", priceId: process.env.STRIPE_PRO_PRICE_ID, amountCents: 2900, credits: 50 },
  credits_5: { kind: "credit_pack", amountCents: 900, credits: 5 },
  credits_15: { kind: "credit_pack", amountCents: 2200, credits: 15 },
} as const;
export type ProductKey = keyof typeof products;
export function getProduct(key: string): (typeof products)[ProductKey] | null { return key in products ? products[key as ProductKey] : null; }
export function newTransactionRef(prefix: "stripe" | "paynow") { return `${prefix}_${randomUUID()}`; }
export function paynowHash(values: Iterable<string>, integrationKey: string) { return createHash("sha512").update([...values].join("") + integrationKey, "utf8").digest("hex").toUpperCase(); }
export function sameHash(actual: string | null, expected: string) { if (!actual) return false; const a = Buffer.from(actual.toUpperCase()); const b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); }
export async function fulfillPayment(transactionRef: string, providerReference: string, status: "PAID" | "FAILED") {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { transactionRef } });
    if (!payment || payment.status === "PAID") return payment;
    const updated = await tx.payment.update({ where: { id: payment.id }, data: { status, providerReference } });
    if (status === "PAID") {
      const userUpdate: { creditBalance?: { increment: number }; subscriptionTier?: "FREE" | "STARTER" | "PRO" } = {};
      if (payment.credits) userUpdate.creditBalance = { increment: payment.credits };
      if (payment.tier) userUpdate.subscriptionTier = payment.tier;
      await tx.user.update({ where: { id: payment.userId }, data: userUpdate });
    }
    return updated;
  });
}
export async function consumeExportCredit(userId: string) {
  const result = await prisma.user.updateMany({ where: { id: userId, creditBalance: { gt: 0 } }, data: { creditBalance: { decrement: 1 } } });
  if (result.count !== 1) throw new Error("INSUFFICIENT_CREDITS");
}
