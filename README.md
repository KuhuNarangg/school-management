# Northstar School Management System

A full-stack, multi-role school management platform built with **Next.js 16 (App Router)**, **React 19**, **PostgreSQL 15**, and **Prisma ORM**.

Northstar provides three role-scoped workspaces (**Administrator**, **Teacher**, and **Guardian**) backed by server-side authorization, immutable audit logging, configurable grade bands, attendance tracking, and an integer-cent financial ledger.

---

## Quick Start & Setup

### 1. Prerequisites
- **Node.js** 20+ (tested on Node 24)
- **PostgreSQL 15+** (local installation or Docker via `docker-compose.yml`)

### 2. Environment Variables
Copy `.env.example` to `.env` and configure your PostgreSQL connection string and session secret:

```bash
cp .env.example .env
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/northstar_school?schema=public` |
| `SESSION_SECRET` | 32+ byte secret key used by `jose` to sign `httpOnly` JWT session cookies | `northstar-school-super-secret-jwt-key-2026-production-grade` |
| `NEXT_PUBLIC_APP_URL` | Base URL of the application | `http://localhost:3000` |

### 3. Database Setup (Local Postgres or Docker)
If you do not have a local PostgreSQL instance running, start the included Docker container:

```bash
docker compose up -d
```

Install dependencies, run Prisma migrations, and seed the database:

```bash
npm install
npm run db:migrate
npm run db:seed
```

To completely reset the database and re-seed synthetic data at any time:

```bash
npm run db:reset
```

### 4. Run the Application

```bash
# Development server
npm run dev

# Production build & start
npm run build
npm start
```

---

## Demo Credentials per Role

All demo accounts share the password **`Demo@1234`**.

| Role | Email | Password | Scope & Highlights |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@school.demo` | `Demo@1234` | Full school-wide access: 60 students, 45 guardians, 5 teachers, 3 classes (6 sections), 6 subjects, exams, fee ledger, reports, and append-only audit logs. |
| **Teacher (Primary Demo)** | `teacher@school.demo` | `Demo@1234` | **Olivia Rhye** — Assigned to **Grade 10 · Section A & Section B** (Biology & Physics). Cannot access Grade 9 or Grade 11 students, fee data, or admin endpoints. |
| **Teacher (Isolation Test)** | `teacher2@school.demo` | `Demo@1234` | **Marcus Vance** — Assigned to Mathematics sections. |
| **Guardian (Primary Demo)** | `guardian@school.demo` | `Demo@1234` | **Jamie Morgan** — Linked to **2 children**: **Olivia Rhye (`STU-24018`, Grade 10 · A)** and **Phoenix Baker (`STU-24017`, Grade 9 · B)**. Can switch between children in the header, view only `PUBLISHED` exam results, and pay family invoices. |
| **Guardian (Isolation Test)** | `guardian2@school.demo` | `Demo@1234` | **Robert Steiner** — Linked to **Lana Steiner (`STU-24016`, Grade 11 · A)** and **Demi Wilkinson (`STU-24015`, Grade 9 · A)**. |

---

## Test Commands

### Unit & API Integration Tests (Vitest)
Verifies authentication, role-based access control (RBAC), IDOR scope isolation (`404` on out-of-scope IDs), duplicate attendance rejection (`409`), marks bounds validation, unpublished result hiding from guardians, self-role-change prevention, overpayment rejection, concurrent payment serialization, grade band evaluation, and cross-role consistency:

```bash
npm test
```

### End-to-End Browser Tests (Playwright)
Runs automated browser verification across Admin, Teacher, and Guardian flows:

```bash
npm run test:e2e
```

---

## Key Security & Domain Rules Enforced
1. **Server-Side Authorization (`lib/server/rbac.ts`):** Every route handler verifies the signed `httpOnly` JWT session (`northstar-session`) against the database, checks role permissions (`401` unauthenticated, `403` wrong role), and enforces relational scope (`404` when a teacher queries an unassigned section/student or a guardian queries another family's student).
2. **Attendance Integrity:** Enforced by a database unique constraint on `(studentId, date, session)` with default session `DAILY`. Teachers can only mark/edit same-day attendance for assigned sections; historical edits require `ADMIN` role and a mandatory audit reason.
3. **Examination Lifecycle & Configurable Grade Bands:** Marks progress from `DRAFT` → `SUBMITTED` → `PUBLISHED`. Guardians never see `DRAFT` or `SUBMITTED` marks. Once `PUBLISHED`, exams are locked; only an Admin can unlock them with a mandatory reason. Grades, GPA points, and pass/fail status are computed dynamically from the `GradeBand` table.
4. **Financial Ledger in Integer Cents:** All monetary amounts (`amountCents`, `totalCents`) are stored as integer minor units (cents), never floats. Payments run inside `Serializable` database transactions with row-level `FOR UPDATE` locking, rejecting overpayments and deriving invoice status (`UNPAID`, `PARTIAL`, `PAID`) from net payments minus reversals.
5. **Append-Only Audit Trail:** Every state-changing action writes to `AuditLog`. Modification (`PUT`/`PATCH`) and deletion (`DELETE`) on `/api/audit-logs` return `405 Method Not Allowed`.

---

## Known Limitations
- Payment processing is simulated in-app (no external Stripe/Razorpay gateway integration by design).
- Students are viewed through the Guardian portal (the `Student.userId` nullable foreign key is already in place to support direct student logins in a future release without schema breaking changes).
- Rate limiting uses an in-memory sliding window store per server process; multi-instance horizontal deployments should back the rate limiter with Redis.
