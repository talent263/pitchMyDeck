import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fulfillPayment, getProduct, newTransactionRef, paynowHash, sameHash } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
const input = z.object({ product: z.enum(["starter", "pro", "credits_5", "credits_15"]) });
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) return handlePaynowWebhook(request);
  try {
    const user = await requireUser(); const { product: key } = input.parse(await request.json()); const product = getProduct(key); const id = process.env.PAYNOW_INTEGRATION_ID; const keySecret = process.env.PAYNOW_INTEGRATION_KEY;
    if (!id || !keySecret || !product) return NextResponse.json({ error: "EcoCash checkout is not configured." }, { status: 503 });
    const reference = newTransactionRef("paynow"); const origin = new URL(request.url).origin; const amount = (product.amountCents / 100).toFixed(2);
    const fields = new URLSearchParams({ id, reference, amount, additionalinfo: `PitchMyDeck ${key}`, returnurl: `${origin}/pricing?payment=return`, resulturl: `${origin}/api/billing/ecocash`, authemail: user.email ?? "", status: "Message" });
    fields.set("hash", paynowHash([...fields.values()], keySecret));
    await prisma.payment.create({ data: { userId: user.id, provider: "PAYNOW", kind: product.kind === "subscription" ? "SUBSCRIPTION" : "CREDIT_PACK", amountCents: product.amountCents, credits: product.credits, tier: "tier" in product ? product.tier : undefined, transactionRef: reference } });
    const response = await fetch("https://www.paynow.co.zw/interface/initiatetransaction", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: fields, signal: AbortSignal.timeout(15_000) }); const result = new URLSearchParams(await response.text());
    if (!response.ok || result.get("status") !== "Ok" || !sameHash(result.get("hash"), paynowHash([...result].filter(([name]) => name.toLowerCase() !== "hash").map(([, value]) => value), keySecret))) throw new Error("Payment gateway validation failed.");
    return NextResponse.json({ checkoutUrl: result.get("browserurl") });
  } catch (error) { const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400; return NextResponse.json({ error: status === 401 ? "Sign in to checkout." : "Unable to create EcoCash payment." }, { status }); }
}
async function handlePaynowWebhook(request: Request) { const key = process.env.PAYNOW_INTEGRATION_KEY; if (!key) return new NextResponse("Not configured", { status: 503 }); const fields = new URLSearchParams(await request.text()); const providedHash = fields.get("hash"); const expected = paynowHash([...fields].filter(([name]) => name.toLowerCase() !== "hash").map(([, value]) => value), key); if (!sameHash(providedHash, expected)) return new NextResponse("Invalid hash", { status: 400 }); const ref = fields.get("reference"); if (!ref) return new NextResponse("Missing reference", { status: 400 }); const paid = ["paid", "awaiting delivery", "delivered"].includes((fields.get("status") ?? "").toLowerCase()); await fulfillPayment(ref, fields.get("paynowreference") ?? ref, paid ? "PAID" : "FAILED"); return new NextResponse("OK"); }
