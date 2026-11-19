import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyStudent, verifyToken } from "../middlewares/auth.js";
import { badId, isValidId, param } from "../utils/helpers.js";

const router = Router();

// Only students can save tuitions
router.use(verifyToken, verifyStudent);

// Saved tuition ids are kept inside the user document
async function getSavedIds(email: string): Promise<string[]> {
  const user = await collections.users.findOne({ email }, { projection: { bookmarks: 1 } });
  return (user?.bookmarks as string[] | undefined) ?? [];
}

// Only the ids (used to fill the bookmark icons on every card)
router.get("/ids", async (req, res) => {
  res.json(await getSavedIds(req.user!.email));
});

// Full tuition data for the Saved Tuitions page
router.get("/", async (req, res) => {
  const ids = (await getSavedIds(req.user!.email)).filter(isValidId);
  if (ids.length === 0) return res.json([]);

  const data = await collections.tuitions
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) }, approvalStatus: "approved" })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(data);
});

// Save a tuition
router.post("/:tuitionId", async (req, res) => {
  const tuitionId = param(req, "tuitionId");
  if (!isValidId(tuitionId)) return badId(res);

  const tuition = await collections.tuitions.findOne(
    { _id: new ObjectId(tuitionId), approvalStatus: "approved" },
    { projection: { _id: 1 } }
  );
  if (!tuition) return res.status(404).json({ message: "Tuition not found" });

  // $addToSet never adds the same id twice
  await collections.users.updateOne({ email: req.user!.email }, { $addToSet: { bookmarks: tuitionId } });
  res.status(201).json({ message: "Tuition saved" });
});

// Remove a saved tuition
router.delete("/:tuitionId", async (req, res) => {
  const tuitionId = param(req, "tuitionId");
  if (!isValidId(tuitionId)) return badId(res);

  await collections.users.updateOne({ email: req.user!.email }, { $pull: { bookmarks: tuitionId } });
  res.json({ message: "Tuition removed from saved list" });
});

export default router;