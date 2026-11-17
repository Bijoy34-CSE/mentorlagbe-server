import { Router } from "express";
import { collections } from "../config/db.js";

const router = Router();

// Public numbers for the home page
router.get("/stats", async (_req, res) => {
  const [tutors, students, tuitions, accepted] = await Promise.all([
    collections.users.countDocuments({ role: "tutor" }),
    collections.users.countDocuments({ role: "student" }),
    collections.tuitions.countDocuments({ approvalStatus: "approved", isActive: true }),
    collections.applications.countDocuments({ status: "accepted" }),
  ]);
  res.json({ tutors, students, tuitions, accepted });
});

export default router;