import { MongoClient } from "mongodb";
import { env } from "./env.js";

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
  console.log("MongoDB connected");
}