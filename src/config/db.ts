import dns from "node:dns";
import { MongoClient } from "mongodb";
import { env } from "./env.js";

// Some ISPs block SRV lookups, so we use Google DNS for MongoDB
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const client = new MongoClient(env.MONGODB_URI);
export const db = client.db(env.DB_NAME);

// The 4 main collections of the project
export const collections = {
  users: db.collection("users"),
  tuitions: db.collection("tuitions"),
  applications: db.collection("applications"),
  payments: db.collection("payments"),
};

export async function connectDB() {
  await client.connect();
  await db.command({ ping: 1 });

  // Indexes stop duplicate payments and duplicate applications
  await collections.payments.createIndex({ stripeSessionId: 1 }, { unique: true });
  await collections.applications.createIndex({ tuitionId: 1, studentEmail: 1 }, { unique: true });

  console.log("MongoDB connected");
}