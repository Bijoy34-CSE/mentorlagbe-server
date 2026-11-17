import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import adminRoutes from "./routes/admin.routes.js";
import applicationRoutes from "./routes/applications.routes.js";
import tuitionRoutes from "./routes/tuitions.routes.js";

const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// BetterAuth must be mounted BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "MentorLagbe API is running" });
});

app.use("/api/tuitions", tuitionRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);

// Unknown routes
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Last safety net for unexpected errors
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server" });
});

async function start() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});