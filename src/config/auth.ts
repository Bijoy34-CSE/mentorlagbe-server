import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";
import { db } from "./db.js";
import { env } from "./env.js";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  trustedOrigins: [env.CLIENT_URL],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  // Store users in our "users" collection
  user: {
    modelName: "users",
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "student", input: true },
      phone: { type: "string", required: false, input: true },
      bio: { type: "string", required: false, input: true },
      plan: { type: "string", required: false, defaultValue: "free", input: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Only "student" or "tutor" can be chosen at sign up.
          // This stops anyone from making themselves an admin.
          const role = (user as { role?: string }).role === "tutor" ? "tutor" : "student";
          return { data: { ...user, role, plan: "free" } };
        },
      },
    },
  },

  plugins: [
    jwt({
      jwt: {
        expirationTime: "1h",
        // Keep the token payload small
        definePayload: ({ user }) => {
          const u = user as typeof user & { role?: string };
          return { id: u.id, email: u.email, role: u.role };
        },
      },
    }),
  ],
});