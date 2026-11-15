# Northstar School Management System — MERN Architecture

## 1. Stack Overview
- **Database:** MongoDB Atlas (`mongoose` 8 with 20 collection schemas and compound unique indexes in `server/src/models/index.ts`).
- **Backend API:** Express.js (`server/src/app.ts` and `server/src/index.ts`) serving 21 REST API endpoint modules under `/api/*`.
- **Frontend SPA:** React 19 + Vite 6 + React Router 7 (`client/src/App.tsx`) with Tailwind CSS v4 (`client/src/globals.css`).
- **Authentication & Security:**
  - Passwords hashed with `bcryptjs` (cost factor 10).
  - Signed `HS256` JWT sessions via `jose`, stored in `httpOnly` cookie (`northstar-session`) plus `Bearer` header support for cross-origin deployments.
  - CSRF protection (`x-csrf-token` + Same-Origin verification) on all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Sliding-window login rate limiter per IP + email.

## 2. Role-Based Access Control (RBAC) & Scope Isolation
All authorization is enforced on the Express backend (`server/src/utils/rbac.ts`):
- **401 Unauthorized:** Missing, expired, or invalid JWT session.
- **403 Forbidden:** Authenticated user whose role is not permitted for the endpoint or action (e.g., Teacher requesting `/api/fees/invoices` or attempting to publish an exam; Guardian attempting to post attendance or marks).
- **404 Not Found:** Authenticated user requesting a record outside their scope (e.g., Teacher requesting a student or section not in their `TeacherAssignment` records; Guardian requesting a student or invoice not linked via `StudentGuardian`), preventing ID enumeration.

## 3. Core Domain Invariants
1. **Attendance (`AttendanceRecord`):**
   - Compound unique index on `{ studentId: 1, date: 1, session: 1 }`.
   - Duplicate submissions without `allowUpdate` return `409 Conflict`.
   - Teachers can only record or edit same-day attendance for assigned sections; historical attendance modifications are restricted to Administrators and require an `editReason` logged to `AuditLog`.
2. **Examinations, Marks & Grading (`Exam`, `ExamSubject`, `MarkEntry`, `GradeBand`):**
   - Lifecycle: `DRAFT` -> `SUBMITTED` -> `PUBLISHED` (locked).
   - Marks are validated as integers in `[0, maxMarks]`.
   - Guardians only ever receive `PUBLISHED` results; draft and submitted marks are filtered out on the server.
   - Grade bands use continuous percentage intervals (`evaluateGradeFromBands`) so fractional averages (e.g., `89.5%`) never fall into gaps.
3. **Fee Management (`FeeCategory`, `FeeStructure`, `FeeInvoice`, `FeePayment`):**
   - All monetary amounts are stored and calculated in integer minor units (`amountCents`, `totalCents`).
   - Payments are never deleted or mutated; corrections use `REVERSAL` entries linked via a partial unique index on `reversedPaymentId`.
   - Concurrent payments on the same invoice are serialized via a transaction queue to prevent race-condition overpayments.
4. **Audit Log (`AuditLog`):**
   - Strictly append-only (`PUT`, `PATCH`, and `DELETE` on `/api/audit-logs` return `405 Method Not Allowed`).
