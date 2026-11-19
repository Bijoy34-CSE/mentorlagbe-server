import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import adminRoutes from "./routes/admin.routes.js";
import applicationRoutes from "./routes/applications.routes.js";
import paymentRoutes, { stripeWebhook } from "./routes/payments.routes.js";
import publicRoutes from "./routes/public.routes.js";
import tuitionRoutes from "./routes/tuitions.routes.js";
import userRoutes from "./routes/users.routes.js";
import bookmarkRoutes from "./routes/bookmarks.routes.js";
const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// On Vercel the server wakes up on demand, so we make sure MongoDB is connected
// before any route runs. After the first time, the same connection is reused.
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// BetterAuth must be mounted BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

// Stripe needs the raw body to check the signature
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "MentorLagbe API is running" });
});

app.use("/api/tuitions", tuitionRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/public", publicRoutes);
// Unknown routes
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Last safety net for unexpected errors
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server" });
});

// Start a normal server only on our own computer. Vercel runs the exported app itself.
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(env.PORT, () => {
        console.log(`Server running on http://localhost:${env.PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });
}

export default app;