import "dotenv/config";

// Throw early if an important variable is missing
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  CLIENT_URL: required("CLIENT_URL"),
  MONGODB_URI: required("MONGODB_URI"),
  DB_NAME: process.env.DB_NAME || "mentorlagbe",
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: required("BETTER_AUTH_URL"),
  // These are used in later phases, so they are optional for now
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  IMGBB_API_KEY: process.env.IMGBB_API_KEY || "",
};