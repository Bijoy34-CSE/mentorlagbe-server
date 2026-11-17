import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyTutor, verifyToken } from "../middlewares/auth.js";
import { badId, escapeRegex, isValidId, param } from "../utils/helpers.js";
import { validateTuition } from "../utils/validateTuition.js";

const router = Router();

const FREE_PLAN_LIMIT = 2;
const publicFilter = { approvalStatus: "approved", isActive: true };

// Public: browse tuitions with server-side search, filter and pagination
router.get("/", async (req, res) => {
  const { search = "", subject = "", classLevel = "", mode = "" } = req.query as Record<string, string>;

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 9, 1), 24);

  const filter: Record<string, unknown> = { ...publicFilter };

  if (search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: regex }, { subject: regex }];
  }
  if (subject) filter.subject = subject;
  if (classLevel) filter.classLevel = classLevel;
  if (mode === "Online" || mode === "Offline") filter.mode = mode;

  const [data, total] = await Promise.all([
    collections.tuitions
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collections.tuitions.countDocuments(filter),
  ]);

  res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
});

// Public: 6 latest tuitions for the home page
router.get("/latest", async (_req, res) => {
  const data = await collections.tuitions
    .find(publicFilter)
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  res.json(data);
});

// Public: values for the filter dropdowns
router.get("/meta", async (_req, res) => {
  const [subjects, classLevels] = await Promise.all([
    collections.tuitions.distinct("subject", publicFilter),
    collections.tuitions.distinct("classLevel", publicFilter),
  ]);
  res.json({ subjects: subjects.sort(), classLevels: classLevels.sort() });
});

// Tutor: all tuitions created by the logged in tutor
router.get("/mine", verifyToken, verifyTutor, async (req, res) => {
  const data = await collections.tuitions
    .find({ tutorEmail: req.user!.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(data);
});

// Public: single tuition with a short tutor profile
router.get("/:id", async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const tuition = await collections.tuitions.findOne({
    _id: new ObjectId(id),
    approvalStatus: "approved",
  });
  if (!tuition) return res.status(404).json({ message: "Tuition not found" });

  const tutor = await collections.users.findOne(
    { email: tuition.tutorEmail },
    { projection: { name: 1, image: 1, bio: 1, plan: 1 } }
  );

  res.json({ ...tuition, tutor });
});

// Tutor: create a new tuition (free plan can create only 2)
router.post("/", verifyToken, verifyTutor, async (req, res) => {
  const result = validateTuition(req.body);
  if ("error" in result) return res.status(400).json({ message: result.error });

  const user = req.user!;

  if (user.plan !== "pro") {
    const count = await collections.tuitions.countDocuments({ tutorEmail: user.email });
    if (count >= FREE_PLAN_LIMIT) {
      return res.status(403).json({
        message: "Free plan allows only 2 tuition posts. Upgrade to Pro for unlimited posts.",
      });
    }
  }

  const doc = {
    ...result.data,
    tutorName: user.name,
    tutorEmail: user.email,
    approvalStatus: "pending",
    isActive: true,
    createdAt: new Date(),
  };

  const inserted = await collections.tuitions.insertOne(doc);
  res.status(201).json({ message: "Tuition submitted for admin approval", insertedId: inserted.insertedId });
});

// Tutor: update own tuition (goes back to pending for a new review)
router.patch("/:id", verifyToken, verifyTutor, async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const result = validateTuition(req.body);
  if ("error" in result) return res.status(400).json({ message: result.error });

  const updated = await collections.tuitions.updateOne(
    { _id: new ObjectId(id), tutorEmail: req.user!.email },
    { $set: { ...result.data, approvalStatus: "pending", updatedAt: new Date() } }
  );
  if (updated.matchedCount === 0) {
    return res.status(404).json({ message: "Tuition not found" });
  }
  res.json({ message: "Tuition updated and sent for review" });
});

// Tutor: switch between Active and Closed
router.patch("/:id/toggle", verifyToken, verifyTutor, async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const tuition = await collections.tuitions.findOne({
    _id: new ObjectId(id),
    tutorEmail: req.user!.email,
  });
  if (!tuition) return res.status(404).json({ message: "Tuition not found" });

  const isActive = !tuition.isActive;
  await collections.tuitions.updateOne({ _id: tuition._id }, { $set: { isActive } });
  res.json({ message: isActive ? "Tuition is active now" : "Tuition is closed", isActive });
});

// Tutor: delete own tuition together with its applications
router.delete("/:id", verifyToken, verifyTutor, async (req, res) => {
  const id = param(req, "id");
  if (!isValidId(id)) return badId(res);

  const deleted = await collections.tuitions.deleteOne({
    _id: new ObjectId(id),
    tutorEmail: req.user!.email,
  });
  if (deleted.deletedCount === 0) {
    return res.status(404).json({ message: "Tuition not found" });
  }

  await collections.applications.deleteMany({ tuitionId: id });
  res.json({ message: "Tuition deleted" });
});

export default router;