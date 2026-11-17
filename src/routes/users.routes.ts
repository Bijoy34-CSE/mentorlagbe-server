import { Router } from "express";
import { collections } from "../config/db.js";
import { verifyToken } from "../middlewares/auth.js";

const router = Router();

// Logged in user: get my full profile
router.get("/me", verifyToken, async (req, res) => {
  const user = await collections.users.findOne(
    { email: req.user!.email },
    { projection: { name: 1, email: 1, image: 1, role: 1, phone: 1, bio: 1, plan: 1, createdAt: 1 } }
  );
  res.json(user);
});

// Logged in user: update my profile
router.patch("/me", verifyToken, async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const phone = String(req.body.phone ?? "").trim();
  const bio = String(req.body.bio ?? "").trim();
  const image = String(req.body.image ?? "").trim();

  if (name.length < 2) {
    return res.status(400).json({ message: "Name must be at least 2 characters" });
  }
  if (phone && !/^[0-9+\-\s]{10,15}$/.test(phone)) {
    return res.status(400).json({ message: "Please enter a valid phone number" });
  }
  if (bio.length > 300) {
    return res.status(400).json({ message: "Bio must be 300 characters or less" });
  }
  if (image && !/^https?:\/\//i.test(image)) {
    return res.status(400).json({ message: "Image must be a valid URL" });
  }

  await collections.users.updateOne(
    { email: req.user!.email },
    { $set: { name, phone, bio, image, updatedAt: new Date() } }
  );
  res.json({ message: "Profile updated successfully" });
});

export default router;