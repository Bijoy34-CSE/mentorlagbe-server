const MODES = ["Online", "Offline"];

export interface TuitionInput {
  title: string;
  subject: string;
  classLevel: string;
  mode: "Online" | "Offline";
  location: string;
  monthlyFee: number;
  daysPerWeek: number;
  bannerImage: string;
  description: string;
}

type Result = { error: string } | { data: TuitionInput };

// Check the tuition form data sent by a tutor
export function validateTuition(body: Record<string, unknown>): Result {
  const title = String(body.title ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const classLevel = String(body.classLevel ?? "").trim();
  const mode = String(body.mode ?? "").trim();
  const location = String(body.location ?? "").trim();
  const bannerImage = String(body.bannerImage ?? "").trim();
  const description = String(body.description ?? "").trim();
  const monthlyFee = Number(body.monthlyFee);
  const daysPerWeek = Number(body.daysPerWeek);

  if (title.length < 5) return { error: "Title must be at least 5 characters" };
  if (!subject) return { error: "Subject is required" };
  if (!classLevel) return { error: "Class level is required" };
  if (!MODES.includes(mode)) return { error: "Mode must be Online or Offline" };
  if (!location) return { error: "Location is required" };
  if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
    return { error: "Monthly fee must be greater than 0" };
  }
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    return { error: "Days per week must be between 1 and 7" };
  }
  if (!bannerImage) return { error: "Banner image is required" };
  if (description.length < 20) {
    return { error: "Description must be at least 20 characters" };
  }

  return {
    data: {
      title,
      subject,
      classLevel,
      mode: mode as "Online" | "Offline",
      location,
      monthlyFee,
      daysPerWeek,
      bannerImage,
      description,
    },
  };
}