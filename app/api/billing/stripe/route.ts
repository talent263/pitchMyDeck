import Stripe from "stripe";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fulfillPayment, getProduct, newTransactionRef } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
const inputSchema = z.object({ product: z.enum(["starter", "pro", "credits_5", "credits_15"]) });
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (signature) return handleWebhook(request, signature);
  try {
    const user = await requireUser(); const { product: key } = inputSchema.parse(await request.json()); const product = getProduct(key);
    const priceId = product && "priceId" in product ? product.priceId : undefined;
    if (!stripe || !product || (product.kind === "subscription" && !priceId)) return NextResponse.json({ error: "Billing is not configured for this product." }, { status: 503 });
    const transactionRef = newTransactionRef("stripe");
    await prisma.payment.create({ data: { userId: user.id, provider: "STRIPE", kind: product.kind === "subscription" ? "SUBSCRIPTION" : "CREDIT_PACK", amountCents: product.amountCents, credits: product.credits, tier: "tier" in product ? product.tier : undefined, transactionRef } });
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({ mode: product.kind === "subscription" ? "subscription" : "payment", customer_email: user.email ?? undefined, client_reference_id: transactionRef, metadata: { transactionRef, userId: user.id }, line_items: priceId ? [{ price: priceId, quantity: 1 }] : [{ price_data: { currency: "usd", product_data: { name: `PitchMyDeck ${product.credits} credits` }, unit_amount: product.amountCents }, quantity: 1 }], success_url: `${origin}/pricing?checkout=success`, cancel_url: `${origin}/pricing?checkout=cancelled` });
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) { const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400; return NextResponse.json({ error: status === 401 ? "Sign in to checkout." : "Invalid checkout request." }, { status }); }
}
async function handleWebhook(request: Request, signature: string) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  try { const event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); if (event.type === "checkout.session.completed") { const session = event.data.object as Stripe.Checkout.Session; const ref = session.metadata?.transactionRef ?? session.client_reference_id; if (ref) await fulfillPayment(ref, session.payment_intent?.toString() ?? session.id, "PAID"); } return NextResponse.json({ received: true }); } catch { return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 }); }
}
