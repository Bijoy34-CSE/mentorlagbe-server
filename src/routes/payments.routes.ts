import { Router } from "express";
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { env } from "../config/env.js";
import { verifyToken } from "../middlewares/auth.js";
import { fulfillSession, getStripe, PLANS } from "../services/stripe.js";

const router = Router();

// Create a Stripe Checkout session for the Pro plan
router.post("/checkout", verifyToken, async (req, res) => {
  const user = req.user!;

  if (user.role === "admin") {
    return res.status(400).json({ message: "Admin accounts do not need a plan" });
  }
  if (user.plan === "pro") {
    return res.status(400).json({ message: "You are already on the Pro plan" });
  }

  const plan = PLANS[user.role];

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.amount * 100,
          product_data: { name: plan.name, description: "MentorLagbe Pro membership" },
        },
      },
    ],
    metadata: { userEmail: user.email, userRole: user.role, planName: plan.name },
    success_url: `${env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CLIENT_URL}/payment/cancel`,
  });

  res.json({ url: session.url });
});

// Called by the success page to confirm the payment
router.get("/verify", verifyToken, async (req, res) => {
  const sessionId = String(req.query.session_id ?? "");
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ message: "Invalid session id" });
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  // A user can only verify their own payment
  if (session.metadata?.userEmail !== req.user!.email) {
    return res.status(403).json({ message: "This payment belongs to another account" });
  }
  if (session.payment_status !== "paid") {
    return res.status(400).json({ message: "Payment is not completed" });
  }

  await fulfillSession(session);

  res.json({
    message: "Payment verified. Your Pro plan is active.",
    planName: session.metadata?.planName,
    amount: (session.amount_total ?? 0) / 100,
  });
});

// Stripe webhook. It needs the raw body, so it is mounted in index.ts
export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, String(signature), env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Webhook signature verification failed");
  }

  if (event.type === "checkout.session.completed") {
    await fulfillSession(event.data.object as Stripe.Checkout.Session);
  }
  res.json({ received: true });
}

export default router;