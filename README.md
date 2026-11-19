# MentorLagbe (Server)

REST API for MentorLagbe, a tuition and mentorship platform. Built with Express, MongoDB, BetterAuth, JWT and Stripe.

- **Live API:** https://mentorlagbe-api-bijoy.vercel.app/
- **Client repository:** https://github.com/Bijoy34-CSE/mentorlagbe-client
- **Live site:** https://mentorlagbe-bijoy.vercel.app/

## Admin Credentials

| Email | Password |
|---|---|
| admin@mentorlagbe.com | Admin@1234 |

## Database (4 collections)

`users`, `tuitions`, `applications`, `payments`

## Key Features

- BetterAuth with the MongoDB adapter and the JWT plugin
- Custom middlewares: `verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`
- Server-side search, filter and pagination for tuitions
- Free plan limit (2 tuitions) and unlimited posts for Pro tutors
- Duplicate application protection (server check and unique index)
- Stripe Checkout, payment verification and webhook with safe duplicate handling
- Admin APIs for stats, users, tuition approval and transactions
- Seed script that creates demo users, tuitions and applications

## NPM Packages

`express`, `cors`, `dotenv`, `mongodb`, `better-auth`, `stripe`, `jose`, `typescript`, `tsx`

## Run Locally

```bash
npm install
npm run seed   # optional: adds demo data
npm run dev
```

Create a `.env` file:

```
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=mentorlagbe
BETTER_AUTH_SECRET=your_long_random_secret
BETTER_AUTH_URL=http://localhost:5000
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
IMGBB_API_KEY=your_imgbb_key
```

## API Overview

| Area | Routes |
|---|---|
| Auth | `/api/auth/*` (BetterAuth) |
| Tuitions | `/api/tuitions`, `/latest`, `/meta`, `/mine`, `/:id` |
| Applications | `/api/applications`, `/mine`, `/tutor`, `/check/:id`, `/:id/status` |
| Users | `/api/users/me` |
| Payments | `/api/payments/checkout`, `/verify`, `/webhook` |
| Admin | `/api/admin/stats`, `/users`, `/tuitions`, `/transactions` |
| Public | `/api/public/stats` |