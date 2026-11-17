import Stripe from "stripe";
import { collections } from "../config/db.js";
import { env } from "../config/env.js";

let stripe: Stripe | null = null;

// Create the Stripe client only when it is needed
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set in .env");
  }
  stripe ??= new Stripe(env.STRIPE_SECRET_KEY);
  return stripe;
}

// Pro plan prices in USD
export const PLANS = {
  tutor: { name: "Pro Tutor Plan", amount: 15 },
  student: { name: "Pro Student Plan", amount: 10 },
} as const;

// Save the payment and upgrade the user.
// It is safe to call this many times for the same session.
export async function fulfillSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const email = session.metadata?.userEmail;
  if (!email) return;

  const user = await collections.users.findOne({ email });
  if (!user) return;

  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  try {
    await collections.payments.insertOne({
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      planName: session.metadata?.planName ?? "Pro Plan",
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
      transactionId: paymentIntent ?? session.id,
      stripeSessionId: session.id,
      paymentStatus: "paid",
      paidAt: new Date(),
    });
  } catch (error) {
    // 11000 means this session was already saved (webhook and verify ran together)
    if ((error as { code?: number }).code !== 11000) throw error;
  }

  await collections.users.updateOne({ email }, { $set: { plan: "pro" } });
}