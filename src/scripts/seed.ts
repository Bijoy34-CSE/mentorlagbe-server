import { auth } from "../config/auth.js";
import { client, collections, connectDB, db } from "../config/db.js";

const ADMIN_PASSWORD = "Admin@1234";
const USER_PASSWORD = "Demo@1234";

interface Person {
  name: string;
  email: string;
  phone: string;
  bio: string;
}

const admin: Person = {
  name: "MentorLagbe Admin",
  email: "admin@mentorlagbe.com",
  phone: "01700000000",
  bio: "Platform administrator of MentorLagbe.",
};

const tutors: (Person & { plan: "free" | "pro" })[] = [
  { name: "Rahim Uddin", email: "rahim@mentorlagbe.com", phone: "01711000001", plan: "pro", bio: "BUET graduate with 6 years of experience teaching HSC Math and Physics." },
  { name: "Nusrat Jahan", email: "nusrat@mentorlagbe.com", phone: "01711000002", plan: "pro", bio: "Medical student who loves teaching Chemistry and Biology to admission candidates." },
  { name: "Tanvir Ahmed", email: "tanvir@mentorlagbe.com", phone: "01711000003", plan: "pro", bio: "Software engineer and mentor. I teach programming from zero to job ready." },
  { name: "Farhana Akter", email: "farhana@mentorlagbe.com", phone: "01711000004", plan: "pro", bio: "IELTS trainer with 7.5 band score and 5 years of coaching experience." },
  { name: "Sabbir Hossain", email: "sabbir@mentorlagbe.com", phone: "01711000005", plan: "free", bio: "Honours student teaching Accounting and ICT at school and college level." },
];

const students: Person[] = [
  { name: "Ayesha Siddika", email: "ayesha@mentorlagbe.com", phone: "01811000001", bio: "HSC candidate preparing for engineering admission." },
  { name: "Imran Hossain", email: "imran@mentorlagbe.com", phone: "01811000002", bio: "University student who wants to learn programming." },
  { name: "Maliha Rahman", email: "maliha@mentorlagbe.com", phone: "01811000003", bio: "Preparing for IELTS to study abroad." },
];

type Status = "approved" | "pending" | "rejected";

// Small helper to keep the data below easy to read
function tuition(
  tutor: number,
  title: string,
  subject: string,
  classLevel: string,
  mode: "Online" | "Offline",
  location: string,
  monthlyFee: number,
  daysPerWeek: number,
  description: string,
  approvalStatus: Status = "approved"
) {
  return { tutor, title, subject, classLevel, mode, location, monthlyFee, daysPerWeek, description, approvalStatus };
}

const tuitionData = [
  tuition(0, "HSC Higher Math Crash Batch", "Math", "HSC", "Online", "Online (Zoom)", 3000, 3, "Complete HSC Higher Math syllabus with weekly practice tests and doubt solving sessions."),
  tuition(0, "HSC Physics: Concept to Problem Solving", "Physics", "HSC", "Offline", "Dhanmondi, Dhaka", 3500, 3, "Small batch of 6 students. We build strong concepts first and then solve board and admission problems."),
  tuition(0, "SSC Higher Math Weekend Batch", "Math", "SSC", "Offline", "Mirpur, Dhaka", 2500, 2, "Weekend classes for SSC students with chapter wise notes and regular model tests."),
  tuition(1, "Chemistry for Admission Candidates", "Chemistry", "Admission", "Online", "Online (Google Meet)", 3200, 4, "Medical and engineering admission chemistry with MCQ practice and previous year questions."),
  tuition(1, "SSC Biology Foundation", "Biology", "SSC", "Offline", "Agrabad, Chattogram", 2200, 3, "Easy explanations, diagrams and short notes to help SSC students score A+ in Biology."),
  tuition(1, "HSC Biology 1st & 2nd Paper", "Biology", "HSC", "Online", "Online (Zoom)", 2800, 3, "Full HSC Biology course with recorded classes, weekly quizzes and one to one feedback."),
  tuition(2, "Python Programming for Beginners", "Programming", "University", "Online", "Online (Google Meet)", 4000, 3, "Start from variables and loops and finish with two real mini projects you can show in your portfolio."),
  tuition(2, "Web Development with JavaScript", "Programming", "Any Level", "Online", "Online (Zoom)", 5000, 3, "Learn HTML, CSS, JavaScript and React step by step by building real websites."),
  tuition(2, "Data Structures & Algorithms Mentorship", "Programming", "University", "Online", "Online (Google Meet)", 6000, 2, "One to one mentorship for interview preparation with weekly problem solving and code review."),
  tuition(3, "IELTS Academic Preparation (Band 7+)", "IELTS", "Any Level", "Online", "Online (Zoom)", 4500, 4, "Focused practice for all four modules with mock tests and detailed speaking and writing feedback."),
  tuition(3, "Spoken English for Job Seekers", "English", "Any Level", "Offline", "Zindabazar, Sylhet", 2000, 3, "Improve your fluency, interview answers and confidence with daily speaking practice."),
  tuition(3, "Class 8 English Grammar & Composition", "English", "Class 6-8", "Offline", "Sonadanga, Khulna", 1800, 3, "Grammar rules, paragraph writing and reading skills explained in a simple and friendly way."),
  tuition(4, "HSC Accounting Practical Batch", "Accounting", "HSC", "Offline", "Boalia, Rajshahi", 2400, 3, "Practical accounting problems solved step by step for HSC Business Studies students.", "pending"),
  tuition(4, "Class 7 Mathematics", "Math", "Class 6-8", "Offline", "Rajshahi", 1500, 2, "Basic math classes for class seven students.", "rejected"),
];

// Sample applications: which student applied to which tuition
const sampleApplications = [
  { student: 0, tuition: 0, status: "accepted" },
  { student: 0, tuition: 3, status: "pending" },
  { student: 1, tuition: 6, status: "pending" },
  { student: 1, tuition: 9, status: "rejected" },
  { student: 2, tuition: 9, status: "accepted" },
  { student: 2, tuition: 1, status: "pending" },
];

// Sign up through BetterAuth (so the password is hashed), then set role and plan
async function createUser(person: Person, role: string, password: string, plan = "free") {
  // Remove the old copy first, so the password is always correct after seeding
  const old = await collections.users.findOne({ email: person.email });
  if (old) {
    const ids = [old._id, String(old._id)];
    await db.collection("account").deleteMany({ userId: { $in: ids } });
    await db.collection("session").deleteMany({ userId: { $in: ids } });
    await collections.users.deleteOne({ _id: old._id });
  }

  await auth.api.signUpEmail({
    body: { name: person.name, email: person.email, password },
  });

  await collections.users.updateOne(
    { email: person.email },
    { $set: { role, plan, phone: person.phone, bio: person.bio } }
  );
}

async function seed() {
  await connectDB();

  await createUser(admin, "admin", ADMIN_PASSWORD);
  for (const tutor of tutors) await createUser(tutor, "tutor", USER_PASSWORD, tutor.plan);
  for (const student of students) await createUser(student, "student", USER_PASSWORD);
  console.log("Users are ready");

  // Remove old seeded data so the script can run again safely
  await collections.tuitions.deleteMany({ seeded: true });
  await collections.applications.deleteMany({ seeded: true });

  const tuitionDocs = tuitionData.map((item, index) => ({
    title: item.title,
    subject: item.subject,
    classLevel: item.classLevel,
    mode: item.mode,
    location: item.location,
    monthlyFee: item.monthlyFee,
    daysPerWeek: item.daysPerWeek,
    // Placeholder photos. Tutors will upload real banners with ImgBB.
    bannerImage: `https://picsum.photos/seed/mentorlagbe-${index + 1}/800/450`,
    description: item.description,
    tutorName: tutors[item.tutor].name,
    tutorEmail: tutors[item.tutor].email,
    approvalStatus: item.approvalStatus,
    isActive: true,
    createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
    seeded: true,
  }));

  const inserted = await collections.tuitions.insertMany(tuitionDocs);
  console.log(`${tuitionDocs.length} tuitions added`);

  const applicationDocs = sampleApplications.map((item, index) => {
    const tuitionDoc = tuitionDocs[item.tuition];
    const student = students[item.student];
    return {
      tuitionId: String(inserted.insertedIds[item.tuition]),
      tuitionTitle: tuitionDoc.title,
      subject: tuitionDoc.subject,
      monthlyFee: tuitionDoc.monthlyFee,
      tutorName: tuitionDoc.tutorName,
      tutorEmail: tuitionDoc.tutorEmail,
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: student.phone,
      preferredSchedule: "Sat, Mon, Wed - 6:00 PM",
      studentNote: "I want to improve my result and I can follow the schedule regularly.",
      status: item.status,
      appliedAt: new Date(Date.now() - index * 12 * 60 * 60 * 1000),
      seeded: true,
    };
  });

  await collections.applications.insertMany(applicationDocs);
  console.log(`${applicationDocs.length} applications added`);

  await client.close();
  console.log("Seeding finished");
}

seed().catch(async (error) => {
  console.error("Seeding failed:", error);
  await client.close();
  process.exit(1);
});