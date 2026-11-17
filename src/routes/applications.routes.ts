import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyStudent, verifyToken, verifyTutor } from "../middlewares/auth.js";
import { badId, isValidId, param } from "../utils/helpers.js";

const router = Router();

// Student: apply for a tuition
router.post("/", verifyToken, verifyStudent, async (req, res) => {
  const tuitionId = String(req.body.tuitionId ?? "");
  const studentPhone = String(req.body.studentPhone ?? "").trim();
  const preferredSchedule = String(req.body.preferredSchedule ?? "").trim();
  const studentNote = String(req.body.studentNote ?? "").trim();

  if (!isValidId(tuitionId)) return badId(res);
  if (studentPhone.length < 10) {
    return res.status(400).json({ message: "Please enter a valid phone number" });
  }
  if (!preferredSchedule) {
    return res.status(400).json({ message: "Preferred schedule is required" });
  }

  const tuition = await collections.tuitions.findOne({
    _id: new ObjectId(tuitionId),
    approvalStatus: "approved",
    isActive: true,
  });
  if (!tuition) {
    return res.status(404).json({ message: "This tuition is not available" });
  }

  const user = req.user!;

  // One student can apply only once for one tuition
  const alreadyApplied = await collections.applications.findOne({
    tuitionId,
    studentEmail: user.email,
  });
  if (alreadyApplied) {
    return res.status(409).json({ message: "You have already applied for this tuition" });
  }

  await collections.applications.insertOne({
    tuitionId,
    tuitionTitle: tuition.title,
    subject: tuition.subject,
    monthlyFee: tuition.monthlyFee,
    tutorName: tuition.tutorName,
    tutorEmail: tuition.tutorEmail,
    studentName: user.name,
    studentEmail: user.email,
    studentPhone,
    preferredSchedule,
    studentNote,
    status: "pending",
    appliedAt: new Date(),
  });

  res.status(201).json({ message: "Application submitted successfully" });
});

// Student: check if already applied (used on the details page)
router.get("/check/:tuitionId", verifyToken, verifyStudent, async (req, res) => {
  const applied = await collections.applications.findOne({
    tuitionId: param(req, "tuitionId"),
    studentEmail: req.user!.email,
  });
  res.json({ applied: Boolean(applied) });
});

// Student: my applications
router.get("/mine", verifyToken, verifyStudent, async (req, res) => {
  const data = await collections.applications
    .find({ studentEmail: req.user!.email })
    .sort({ appliedAt: -1 })
    .toArray();
  res.json(data);
});

// Student: cancel an application while it is still pending
router.delete("/:id", verifyToken, verifyStudent, async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const deleted = await collections.applications.deleteOne({
    _id: new ObjectId(id),
    studentEmail: req.user!.email,
    status: "pending",
  });
  if (deleted.deletedCount === 0) {
    return res.status(400).json({ message: "Only your pending applications can be cancelled" });
  }
  res.json({ message: "Application cancelled" });
});

// Tutor: all applicants for my tuitions
router.get("/tutor", verifyToken, verifyTutor, async (req, res) => {
  const data = await collections.applications
    .find({ tutorEmail: req.user!.email })
    .sort({ appliedAt: -1 })
    .toArray();
  res.json(data);
});

// Tutor: accept or reject an application
router.patch("/:id/status", verifyToken, verifyTutor, async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const status = String(req.body.status ?? "");
  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status must be accepted or rejected" });
  }

  const updated = await collections.applications.updateOne(
    { _id: new ObjectId(id), tutorEmail: req.user!.email },
    { $set: { status } }
  );
  if (updated.matchedCount === 0) {
    return res.status(404).json({ message: "Application not found" });
  }
  res.json({ message: `Application ${status}` });
});

export default router;