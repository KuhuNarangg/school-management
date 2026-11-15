# Northstar Academy — School Management System (MERN Stack)

A full-stack, role-aware **MERN** (**MongoDB Atlas**, **Express.js**, **React + Vite**, **Node.js**) school management system with three dedicated workspaces (**Administrator**, **Teacher**, and **Guardian**), server-enforced Role-Based Access Control (RBAC), daily attendance, examination grading & publishing, integer-cents fee ledger with partial payments and reversals, CSV reports, and an append-only audit log.

---

## Architecture & Stack

```
school-management/
├── client/                  # React 19 + Vite 6 + React Router 7 + Tailwind CSS v4 SPA
│   ├── src/
│   │   ├── App.tsx          # Role-guarded routes (/admin/*, /teacher/*, /guardian/*)
│   │   ├── api-client.ts    # Fetch interceptor (VITE_API_URL + credentials + CSRF + Bearer)
│   │   ├── components/      # Northstar UI & Role Workspace components
│   │   └── lib/             # Shared types & navigation definitions
│   ├── index.html
│   ├── vite.config.ts       # Port 3000 + /api proxy to Express server (port 5000)
│   └── package.json
├── server/                  # Express 5 + Mongoose 8 + Node.js REST API Server
│   ├── src/
│   │   ├── index.ts         # Express server entry point (port 5000)
│   │   ├── app.ts           # Express app & REST route mounting + static SPA serving
│   │   ├── db.ts            # MongoDB Atlas connection & Mongoose query engine
│   │   ├── models/index.ts  # 20 Mongoose schemas & compound unique indexes
│   │   ├── routes/          # 21 REST API endpoint modules (/api/*)
│   │   ├── utils/           # Auth (JWT + bcrypt), RBAC, Grading, Fees, Audit logger
│   │   └── seed.ts          # Idempotent MongoDB Atlas seed script
│   └── package.json
├── tests/                   # Vitest backend & QA integration test suites (24 tests)
├── e2e/                     # Playwright end-to-end browser test suites (7 scenarios)
└── package.json             # Root scripts to run/build/test both server and client
```

---

## Demo Credentials (Password for all: `Demo@1234`)

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@school.demo` | `Demo@1234` | Full school-wide administration, academic setup, exam publishing, fees, reports & audit logs |
| **Teacher** | `teacher@school.demo` | `Demo@1234` | Olivia Rhye — Assigned to **Grade 10 · Section A & B** (*Biology* & *Physics*) |
| **Teacher 2** | `teacher2@school.demo` | `Demo@1234` | Marcus Vance — Assigned to *Mathematics* across Grades 9, 10, 11 |
| **Guardian** | `guardian@school.demo` | `Demo@1234` | Jamie Morgan — Linked to **Olivia Rhye** (`STU-24018`) & **Phoenix Baker** (`STU-24017`) |
| **Guardian 2** | `guardian2@school.demo` | `Demo@1234` | Robert Steiner — Linked to **Lana Steiner** (`STU-24016`) & **Demi Wilkinson** (`STU-24015`) |

---

## Local Setup & Running

### 1. Environment Variables
Copy `.env.example` to `.env` (and `server/.env.example` to `server/.env`):

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Set your MongoDB Atlas URI in `.env` and `server/.env`:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.l6mbzkz.mongodb.net/northstar_school?retryWrites=true&w=majority"
SESSION_SECRET="replace-with-a-random-32-byte-secret"
PORT=5000
CLIENT_ORIGIN="http://localhost:3000"
VITE_API_URL=""
```

### 2. Install Dependencies & Seed MongoDB Atlas
```bash
npm install
npm run db:seed
```

### 3. Start the MERN Development Servers
```bash
npm run dev
```
- **React + Vite Client:** `http://localhost:3000`
- **Express + Mongoose API Server:** `http://localhost:5000` (with `/api/health` health check)

---

## Manual Cloud Deployment Guide

You can deploy this repository either as **one unified full-stack web service** OR as **separate Frontend (`client`) + Backend (`server`) services**:

### Option A: Single Unified Service (Render / Railway / Fly.io)
Because the Express server (`server/src/app.ts`) automatically serves the built React app from `client/dist` whenever present:
1. **Root Directory:** `.` (repository root)
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Environment Variables:**
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `SESSION_SECRET` = any strong random secret string
   - `PORT` = `5000` (or provided automatically by Render/Railway)

### Option B: Split Frontend (Vercel / Netlify) + Backend (Render / Railway)
1. **Backend Service (`server/`):**
   - **Root Directory:** `.` (or `server`)
   - **Build Command:** `npm install && npm run build:server`
   - **Start Command:** `npm start`
   - **Environment Variables:** `MONGODB_URI`, `SESSION_SECRET`, `PORT=5000`
2. **Frontend Static Site (`client/`):**
   - **Root Directory:** `.` (or `client`)
   - **Build Command:** `npm install && npm run build:client`
   - **Output Directory:** `client/dist` (or `dist` if Root Directory is `client`)
   - **Environment Variables:**
     - `VITE_API_URL` = `https://your-backend-service.onrender.com` (no trailing slash)

---

## Testing & Verification

```bash
# Run all 24 backend & QA integration tests against MongoDB Atlas
npm test

# Run all 7 Playwright E2E browser scenarios across Admin, Teacher, and Guardian
npm run test:e2e
```
