import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { collections } from "../config/db.js";
import { env } from "../config/env.js";

export type Role = "student" | "tutor" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  plan: "free" | "pro";
}

// Add "user" to the Express request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Public keys of BetterAuth, used to check the token signature
const jwks = createRemoteJWKSet(new URL(`${env.BETTER_AUTH_URL}/api/auth/jwks`));

// 1. Check the JWT token and load the user from the database
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: token missing" });
    }

    const token = header.split(" ")[1];
    const { payload } = await jwtVerify(token, jwks);

    // Read the user from DB so the role is always fresh
    const user = await collections.users.findOne({ email: payload.email as string });
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan ?? "free",
    };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
}

// Helper that builds a role checker
function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: `Forbidden: ${role} access only` });
    }
    next();
  };
}

// Always use these after verifyToken
export const verifyStudent = requireRole("student");
export const verifyTutor = requireRole("tutor");
export const verifyAdmin = requireRole("admin");