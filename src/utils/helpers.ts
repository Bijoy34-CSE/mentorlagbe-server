import type { Request, Response } from "express";

// Escape special characters so user input is safe inside a RegExp
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A MongoDB ObjectId is a 24 character hex string
export function isValidId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

export function badId(res: Response) {
  return res.status(400).json({ message: "Invalid id" });
}

// Read a route param as a plain string
export function param(req: Request, name: string): string {
  return String(req.params[name] ?? "");
}