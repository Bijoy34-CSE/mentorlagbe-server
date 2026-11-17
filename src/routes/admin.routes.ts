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
// All registered users
router.get("/users", async (_req, res) => {
  const data = await collections.users.find().sort({ createdAt: -1 }).toArray();
  res.json(data);
});

// Change the role of a user
router.patch("/users/:id/role", async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const role = String(req.body.role ?? "");
  if (!["student", "tutor", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  // An admin cannot remove their own admin access by mistake
  if (id === req.user!.id) {
    return res.status(400).json({ message: "You cannot change your own role" });
  }

  const updated = await collections.users.updateOne({ _id: new ObjectId(id) }, { $set: { role } });
  if (updated.matchedCount === 0) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ message: `Role changed to ${role}` });
});

// Platform statistics for the admin overview
router.get("/stats", async (_req, res) => {
  const [totalUsers, totalTutors, totalStudents, pendingTuitions, approvedTuitions, revenue] =
    await Promise.all([
      collections.users.countDocuments(),
      collections.users.countDocuments({ role: "tutor" }),
      collections.users.countDocuments({ role: "student" }),
      collections.tuitions.countDocuments({ approvalStatus: "pending" }),
      collections.tuitions.countDocuments({ approvalStatus: "approved" }),
      collections.payments.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]).toArray(),
    ]);

  res.json({
    totalUsers,
    totalTutors,
    totalStudents,
    pendingTuitions,
    approvedTuitions,
    totalRevenue: revenue[0]?.total ?? 0,
  });
});

// All Stripe payment records
router.get("/transactions", async (_req, res) => {
  const data = await collections.payments.find().sort({ paidAt: -1 }).toArray();
  res.json(data);
});
export default router;