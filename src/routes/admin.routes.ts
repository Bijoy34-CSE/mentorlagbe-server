import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyAdmin, verifyToken } from "../middlewares/auth.js";
import { badId, isValidId, param } from "../utils/helpers.js";

const router = Router();

// Every admin route needs a valid token and the admin role
router.use(verifyToken, verifyAdmin);

// All tuitions submitted by tutors
router.get("/tuitions", async (_req, res) => {
  const data = await collections.tuitions.find().sort({ createdAt: -1 }).toArray();
  res.json(data);
});

// Approve or reject a tuition
router.patch("/tuitions/:id/status", async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const status = String(req.body.status ?? "");
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status must be approved or rejected" });
  }

  const updated = await collections.tuitions.updateOne(
    { _id: new ObjectId(id) },
    { $set: { approvalStatus: status } }
  );
  if (updated.matchedCount === 0) {
    return res.status(404).json({ message: "Tuition not found" });
  }
  res.json({ message: `Tuition ${status}` });
});

export default router;