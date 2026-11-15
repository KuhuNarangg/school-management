import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from '@/lib/server/auth'
import { evaluateGradeFromBands, getGradeBands } from '@/lib/server/grading'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as logoutPost } from '@/app/api/auth/logout/route'
import { GET as meGet } from '@/app/api/auth/me/route'
import { GET as getStudents, POST as createStudent } from '@/app/api/students/route'
import {
  GET as getStudentById,
  PATCH as patchStudentById,
  DELETE as deleteStudentById,
} from '@/app/api/students/[id]/route'
import {
  GET as getGuardians,
  POST as createGuardian,
  PATCH as patchGuardian,
  DELETE as deleteGuardian,
} from '@/app/api/guardians/route'
import {
  GET as getTeachers,
  POST as createTeacher,
  PATCH as patchTeacher,
  DELETE as deleteTeacher,
} from '@/app/api/teachers/route'
import {
  GET as getClasses,
  POST as createClassSection,
  PATCH as patchClassSection,
  DELETE as deleteClassSection,
} from '@/app/api/classes/route'
import {
  GET as getSubjects,
  POST as createSubject,
  PATCH as patchSubject,
  DELETE as deleteSubject,
} from '@/app/api/subjects/route'
import {
  GET as getAssignments,
  POST as createAssignment,
  DELETE as deleteAssignment,
} from '@/app/api/assignments/route'
import {
  GET as getAttendance,
  POST as postAttendance,
  PATCH as patchAttendance,
} from '@/app/api/attendance/route'
import { GET as getExams, POST as postExam, PATCH as patchExam } from '@/app/api/exams/route'
import { GET as getMarks, POST as postMarks } from '@/app/api/marks/route'
import { GET as getResults } from '@/app/api/results/route'
import { GET as getInvoices, POST as postInvoice } from '@/app/api/fees/invoices/route'
import { POST as postPayment } from '@/app/api/fees/payments/route'
import { GET as getStructures, POST as postStructure } from '@/app/api/fees/structures/route'
import { GET as getDashboard } from '@/app/api/dashboard/route'
import { GET as getReports } from '@/app/api/reports/route'
import { GET as getAuditLogs } from '@/app/api/audit-logs/route'
import { PATCH as patchProfile } from '@/app/api/profile/route'

async function makeAuthedRequest(
  url: string,
  email: string,
  method = 'GET',
  body?: unknown,
): Promise<Request> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  const roleMap = { ADMIN: 'admin', TEACHER: 'teacher', GUARDIAN: 'guardian' } as const
  const csrfToken = 'qa-csrf-token-999'
  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    initials: user.initials,
    role: roleMap[user.role],
    csrfToken,
  })
  return new Request(url, {
    method,
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${token}; ${CSRF_COOKIE_NAME}=${csrfToken}`,
      'x-csrf-token': csrfToken,
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Comprehensive QA Suite — Auth, RBAC, CRUD, Attendance, Exams, Fees & Ledger', () => {
  beforeAll(async () => {
    const count = await prisma.student.count()
    expect(count).toBeGreaterThanOrEqual(60)
  })

  describe('Section 3: Authentication & Session Security', () => {
    it('authenticates valid credentials and returns user profile via /api/auth/me', async () => {
      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.10.1.1' },
        body: JSON.stringify({ role: 'admin', email: 'admin@school.demo', password: 'Demo@1234' }),
      })
      const loginRes = await loginPost(loginReq)
      expect(loginRes.status).toBe(200)

      const meReq = await makeAuthedRequest('http://localhost:3000/api/auth/me', 'admin@school.demo')
      const meRes = await meGet(meReq)
      expect(meRes.status).toBe(200)
      const meJson = await meRes.json()
      expect(meJson.user.email).toBe('admin@school.demo')
      expect(meJson.user.role).toBe('admin')
    })

    it('rejects invalid email format with 400 and nonexistent user with 401', async () => {
      const badFormatReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.10.1.2' },
        body: JSON.stringify({ role: 'admin', email: 'not-an-email', password: 'Demo@1234' }),
      })
      const badFormatRes = await loginPost(badFormatReq)
      expect(badFormatRes.status).toBe(400)

      const unknownReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.10.1.3' },
        body: JSON.stringify({ role: 'admin', email: 'nobody@school.demo', password: 'Demo@1234' }),
      })
      const unknownRes = await loginPost(unknownReq)
      expect(unknownRes.status).toBe(401)
    })

    it('clears session cookies on logout and rejects tampered JWT tokens', async () => {
      const logoutReq = new Request('http://localhost:3000/api/auth/logout', { method: 'POST' })
      const logoutRes = await logoutPost(logoutReq)
      expect(logoutRes.status).toBe(303)
      expect(logoutRes.headers.get('set-cookie')).toContain(`${SESSION_COOKIE_NAME}=;`)

      const verified = await verifySessionToken('eyJhbGciOiJIUzI1NiJ9.tampered.signature')
      expect(verified).toBeNull()
    })

    it('blocks users from escalating their own role or status via PATCH /api/profile', async () => {
      const req = await makeAuthedRequest(
        'http://localhost:3000/api/profile',
        'teacher@school.demo',
        'PATCH',
        { name: 'Olivia Reed', role: 'ADMIN', status: 'ACTIVE' },
      )
      const res = await patchProfile(req)
      expect(res.status).toBe(403)
    })
  })

  describe('Section 4: Role-Based Permission & Scope Isolation', () => {
    it('enforces Teacher scope across students, classes, attendance, marks, and blocks admin/fee endpoints', async () => {
      // Teacher can list their assigned students
      const stRes = await getStudents(
        await makeAuthedRequest('http://localhost:3000/api/students', 'teacher@school.demo'),
      )
      expect(stRes.status).toBe(200)
      const stData = await stRes.json()
      expect(stData.students.every((s: { grade: string }) => s.grade.includes('Grade 10'))).toBe(true)

      // Teacher cannot access Grade 9 student STU-24001 (404 IDOR protection)
      const outOfScopeRes = await getStudentById(
        await makeAuthedRequest('http://localhost:3000/api/students/STU-24001', 'teacher@school.demo'),
        { params: Promise.resolve({ id: 'STU-24001' }) },
      )
      expect(outOfScopeRes.status).toBe(404)

      // Teacher cannot access admin endpoints (403)
      const tDirRes = await getTeachers(
        await makeAuthedRequest('http://localhost:3000/api/teachers', 'teacher@school.demo'),
      )
      expect(tDirRes.status).toBe(403)

      const gDirRes = await getGuardians(
        await makeAuthedRequest('http://localhost:3000/api/guardians', 'teacher@school.demo'),
      )
      expect(gDirRes.status).toBe(403)

      const auditRes = await getAuditLogs(
        await makeAuthedRequest('http://localhost:3000/api/audit-logs', 'teacher@school.demo'),
      )
      expect(auditRes.status).toBe(403)

      const feeRes = await getInvoices(
        await makeAuthedRequest('http://localhost:3000/api/fees/invoices', 'teacher@school.demo'),
      )
      expect(feeRes.status).toBe(403)
    })

    it('enforces Guardian scope strictly to linked children and blocks official record modification', async () => {
      // Guardian can view linked child STU-24018
      const ownChildRes = await getStudentById(
        await makeAuthedRequest('http://localhost:3000/api/students/STU-24018', 'guardian@school.demo'),
        { params: Promise.resolve({ id: 'STU-24018' }) },
      )
      expect(ownChildRes.status).toBe(200)

      // Guardian gets 404 for another guardian's child STU-24016 across all endpoints
      const otherStudentRes = await getStudentById(
        await makeAuthedRequest('http://localhost:3000/api/students/STU-24016', 'guardian@school.demo'),
        { params: Promise.resolve({ id: 'STU-24016' }) },
      )
      expect(otherStudentRes.status).toBe(404)

      const otherAttRes = await getAttendance(
        await makeAuthedRequest(
          'http://localhost:3000/api/attendance?studentId=STU-24016',
          'guardian@school.demo',
        ),
      )
      expect(otherAttRes.status).toBe(404)

      const otherResultRes = await getResults(
        await makeAuthedRequest(
          'http://localhost:3000/api/results?studentId=STU-24016',
          'guardian@school.demo',
        ),
      )
      expect(otherResultRes.status).toBe(404)

      const otherInvoiceRes = await getInvoices(
        await makeAuthedRequest(
          'http://localhost:3000/api/fees/invoices?studentId=STU-24016',
          'guardian@school.demo',
        ),
      )
      expect(otherInvoiceRes.status).toBe(404)

      // Guardian cannot modify attendance, marks, or create/reverse invoices (403)
      const modAttRes = await postAttendance(
        await makeAuthedRequest('http://localhost:3000/api/attendance', 'guardian@school.demo', 'POST', {
          records: [{ studentId: 'STU-24018', status: 'PRESENT' }],
        }),
      )
      expect(modAttRes.status).toBe(403)

      const modMarksRes = await postMarks(
        await makeAuthedRequest('http://localhost:3000/api/marks', 'guardian@school.demo', 'POST', {
          entries: [{ studentId: 'STU-24018', marksObtained: 100 }],
        }),
      )
      expect(modMarksRes.status).toBe(403)

      const createInvRes = await postInvoice(
        await makeAuthedRequest('http://localhost:3000/api/fees/invoices', 'guardian@school.demo', 'POST', {
          studentId: 'STU-24018',
          title: 'Unauthorized',
          amountCents: 1000,
        }),
      )
      expect(createInvRes.status).toBe(403)
    })
  })

  describe('Section 5: Academic Administration CRUD & Relational Integrity', () => {
    it('performs full CRUD and constraint checks across Classes, Sections, Subjects, Teachers, Assignments, Students, and Guardians', async () => {
      // 1. Create Class & Section
      const clsRes = await createClassSection(
        await makeAuthedRequest('http://localhost:3000/api/classes', 'admin@school.demo', 'POST', {
          name: 'Grade 12 QA',
          gradeLevel: 12,
          sectionName: 'Z',
          room: 'Room 401',
          capacity: 30,
        }),
      )
      expect(clsRes.status).toBe(201)
      const { schoolClass, section } = await clsRes.json()

      // Duplicate class-section rejected with 400
      const dupClsRes = await createClassSection(
        await makeAuthedRequest('http://localhost:3000/api/classes', 'admin@school.demo', 'POST', {
          name: 'Grade 12 QA',
          gradeLevel: 12,
          sectionName: 'Z',
        }),
      )
      expect(dupClsRes.status).toBe(400)

      // Update section room & capacity
      const patchSecRes = await patchClassSection(
        await makeAuthedRequest('http://localhost:3000/api/classes', 'admin@school.demo', 'PATCH', {
          sectionId: section.id,
          room: 'Room 402',
          capacity: 32,
        }),
      )
      expect(patchSecRes.status).toBe(200)

      // 2. Create Subject (and test invalid passing > max marks)
      const badSubRes = await createSubject(
        await makeAuthedRequest('http://localhost:3000/api/subjects', 'admin@school.demo', 'POST', {
          code: 'BAD-999',
          name: 'Invalid Subject',
          maxMarksDefault: 50,
          passingMarksDefault: 80,
        }),
      )
      expect(badSubRes.status).toBe(400)

      const subRes = await createSubject(
        await makeAuthedRequest('http://localhost:3000/api/subjects', 'admin@school.demo', 'POST', {
          code: 'AST-120',
          name: 'Astrophysics QA',
          department: 'Science',
          maxMarksDefault: 100,
          passingMarksDefault: 40,
        }),
      )
      expect(subRes.status).toBe(201)
      const { subject } = await subRes.json()

      // Update Subject
      const patchSubRes = await patchSubject(
        await makeAuthedRequest('http://localhost:3000/api/subjects', 'admin@school.demo', 'PATCH', {
          id: subject.code,
          department: 'STEM',
        }),
      )
      expect(patchSubRes.status).toBe(200)

      // 3. Create Teacher
      const tchRes = await createTeacher(
        await makeAuthedRequest('http://localhost:3000/api/teachers', 'admin@school.demo', 'POST', {
          name: 'Dr. Carl Sagan QA',
          email: 'carl.sagan.qa@school.demo',
          department: 'Science',
        }),
      )
      expect(tchRes.status).toBe(201)
      const { teacher } = await tchRes.json()

      // Update Teacher
      const patchTchRes = await patchTeacher(
        await makeAuthedRequest('http://localhost:3000/api/teachers', 'admin@school.demo', 'PATCH', {
          id: teacher.id,
          qualification: 'Ph.D. Astrophysics',
        }),
      )
      expect(patchTchRes.status).toBe(200)

      // 4. Create Teacher Assignment
      const asgRes = await createAssignment(
        await makeAuthedRequest('http://localhost:3000/api/assignments', 'admin@school.demo', 'POST', {
          teacherId: teacher.id,
          sectionId: section.id,
          subjectId: subject.dbId,
          scheduleTime: '11:00',
        }),
      )
      expect(asgRes.status).toBe(201)
      const { assignment } = await asgRes.json()

      // 5. Create Student (test invalid class-section mismatch first)
      const otherSection = await prisma.section.findFirstOrThrow({
        where: { classId: { not: schoolClass.id } },
      })
      const mismatchStRes = await createStudent(
        await makeAuthedRequest('http://localhost:3000/api/students', 'admin@school.demo', 'POST', {
          name: 'Mismatch Student',
          classId: schoolClass.id,
          sectionId: otherSection.id,
        }),
      )
      expect(mismatchStRes.status).toBe(400)

      const stRes = await createStudent(
        await makeAuthedRequest('http://localhost:3000/api/students', 'admin@school.demo', 'POST', {
          name: 'Sally Ride QA',
          studentCode: 'STU-QA-901',
          email: 'sally.ride.qa@school.demo',
          classId: schoolClass.id,
          sectionId: section.id,
          program: 'Science',
        }),
      )
      expect(stRes.status).toBe(201)
      const { student } = await stRes.json()

      // Duplicate studentCode returns 409 Conflict
      const dupStRes = await createStudent(
        await makeAuthedRequest('http://localhost:3000/api/students', 'admin@school.demo', 'POST', {
          name: 'Duplicate Code Student',
          studentCode: 'STU-QA-901',
          classId: schoolClass.id,
          sectionId: section.id,
        }),
      )
      expect(dupStRes.status).toBe(409)

      // Deleting section while student is enrolled returns 409 Conflict
      const delBusySecRes = await deleteClassSection(
        await makeAuthedRequest(
          `http://localhost:3000/api/classes?sectionId=${section.id}`,
          'admin@school.demo',
          'DELETE',
        ),
      )
      expect(delBusySecRes.status).toBe(409)

      // 6. Create Guardian linked to Student
      const grdRes = await createGuardian(
        await makeAuthedRequest('http://localhost:3000/api/guardians', 'admin@school.demo', 'POST', {
          name: 'Jane Ride QA',
          email: 'jane.ride.qa@school.demo',
          studentIds: [student.id],
        }),
      )
      expect(grdRes.status).toBe(201)
      const { guardian } = await grdRes.json()
      expect(guardian.childrenCount).toBe(1)

      // Update Guardian
      const patchGrdRes = await patchGuardian(
        await makeAuthedRequest('http://localhost:3000/api/guardians', 'admin@school.demo', 'PATCH', {
          id: guardian.id,
          occupation: 'Aerospace Engineer',
        }),
      )
      expect(patchGrdRes.status).toBe(200)

      // Update Student
      const patchStRes = await patchStudentById(
        await makeAuthedRequest(
          `http://localhost:3000/api/students/${student.id}`,
          'admin@school.demo',
          'PATCH',
          { program: 'STEM Honors', status: 'REVIEW' },
        ),
        { params: Promise.resolve({ id: student.id }) },
      )
      expect(patchStRes.status).toBe(200)

      // Clean up created entities in dependency order
      const delGrdRes = await deleteGuardian(
        await makeAuthedRequest(
          `http://localhost:3000/api/guardians?id=${guardian.id}`,
          'admin@school.demo',
          'DELETE',
        ),
      )
      expect(delGrdRes.status).toBe(200)

      const delStRes = await deleteStudentById(
        await makeAuthedRequest(
          `http://localhost:3000/api/students/${student.id}`,
          'admin@school.demo',
          'DELETE',
        ),
        { params: Promise.resolve({ id: student.id }) },
      )
      expect(delStRes.status).toBe(200)

      const delAsgRes = await deleteAssignment(
        await makeAuthedRequest(
          `http://localhost:3000/api/assignments?id=${assignment.id}`,
          'admin@school.demo',
          'DELETE',
        ),
      )
      expect(delAsgRes.status).toBe(200)

      const delTchRes = await deleteTeacher(
        await makeAuthedRequest(
          `http://localhost:3000/api/teachers?id=${teacher.id}`,
          'admin@school.demo',
          'DELETE',
        ),
      )
      expect(delTchRes.status).toBe(200)

      const delSubRes = await deleteSubject(
        await makeAuthedRequest(
          `http://localhost:3000/api/subjects?id=${subject.code}`,
          'admin@school.demo',
          'DELETE',
        ),
      )
      expect(delSubRes.status).toBe(200)

      const delSecRes = await deleteClassSection(
        await makeAuthedRequest(
          `http://localhost:3000/api/classes?sectionId=${section.id}`,
          'admin@school.demo',
          'DELETE',
        ),
      )
      expect(delSecRes.status).toBe(200)
      await prisma.schoolClass.delete({ where: { id: schoolClass.id } })
    })
  })

  describe('Section 6: Attendance Concurrent & Historical Rules', () => {
    it('prevents simultaneous duplicate attendance submissions for the same student, date, and session', async () => {
      const sessionName = `QA_CONCURRENT_${Date.now()}`
      const makeReq = () =>
        makeAuthedRequest('http://localhost:3000/api/attendance', 'teacher@school.demo', 'POST', {
          session: sessionName,
          allowUpdate: false,
          records: [{ studentId: 'STU-24018', status: 'PRESENT' }],
        }).then((req) => postAttendance(req))

      const [res1, res2] = await Promise.all([makeReq(), makeReq()])
      const statuses = [res1.status, res2.status].sort()
      expect(statuses).toEqual([200, 409])

      // Clean up test session record
      const st = await prisma.student.findUniqueOrThrow({ where: { studentCode: 'STU-24018' } })
      await prisma.attendanceRecord.deleteMany({
        where: { studentId: st.id, session: sessionName },
      })
    })
  })

  describe('Section 7: Examination & Grading Boundary Verification', () => {
    it('evaluates fractional percentages accurately across all grade boundaries without gaps', async () => {
      const bands = await getGradeBands()
      expect(evaluateGradeFromBands(95, bands).grade).toBe('A+')
      expect(evaluateGradeFromBands(94.5, bands).grade).toBe('A')
      expect(evaluateGradeFromBands(89.5, bands).grade).toBe('A−')
      expect(evaluateGradeFromBands(84.9, bands).grade).toBe('B+')
      expect(evaluateGradeFromBands(40.0, bands).isPassing).toBe(true)
      expect(evaluateGradeFromBands(39.9, bands).grade).toBe('F')
      expect(evaluateGradeFromBands(39.9, bands).isPassing).toBe(false)
    })

    it('rejects exam creation when passingMarks > maxMarks', async () => {
      const res = await postExam(
        await makeAuthedRequest('http://localhost:3000/api/exams', 'admin@school.demo', 'POST', {
          name: 'Invalid Exam Config',
          maxMarks: 50,
          passingMarks: 60,
        }),
      )
      expect(res.status).toBe(400)
    })
  })

  describe('Section 8: Fee Management, Structures, Reversals & Dashboard Reconciliation', () => {
    it('creates fee structure, records payment and reversal entry, and reconciles ledger totals with dashboard', async () => {
      // 1. Create Fee Structure
      const structRes = await postStructure(
        await makeAuthedRequest('http://localhost:3000/api/fees/structures', 'admin@school.demo', 'POST', {
          name: 'QA Lab Fee',
          category: 'Lab & Stem',
          amountDollars: '150.00',
        }),
      )
      expect(structRes.status).toBe(201)

      const getStructRes = await getStructures(
        await makeAuthedRequest('http://localhost:3000/api/fees/structures', 'admin@school.demo'),
      )
      expect(getStructRes.status).toBe(200)

      // 2. Generate Invoice for STU-24018 ($200.00 = 20000 cents)
      const invRes = await postInvoice(
        await makeAuthedRequest('http://localhost:3000/api/fees/invoices', 'admin@school.demo', 'POST', {
          studentId: 'STU-24018',
          title: 'QA Reversal Test Invoice',
          amountCents: 20000,
        }),
      )
      expect(invRes.status).toBe(201)
      const { invoice } = await invRes.json()

      // 3. Reject zero or negative payment
      const zeroPayRes = await postPayment(
        await makeAuthedRequest('http://localhost:3000/api/fees/payments', 'admin@school.demo', 'POST', {
          invoiceId: invoice.id,
          amountCents: 0,
        }),
      )
      expect(zeroPayRes.status).toBe(400)

      // 4. Record full payment ($200.00)
      const payRes = await postPayment(
        await makeAuthedRequest('http://localhost:3000/api/fees/payments', 'admin@school.demo', 'POST', {
          invoiceId: invoice.id,
          amountCents: 20000,
        }),
      )
      expect(payRes.status).toBe(201)
      const payData = await payRes.json()
      expect(payData.invoice.rawStatus).toBe('PAID')

      // 5. Reverse the payment and verify status returns to UNPAID
      const revRes = await postPayment(
        await makeAuthedRequest('http://localhost:3000/api/fees/payments', 'admin@school.demo', 'POST', {
          action: 'REVERSE',
          paymentId: payData.payment.receiptNo,
          reason: 'QA test reversal verification',
        }),
      )
      expect(revRes.status).toBe(200)
      const revData = await revRes.json()
      expect(revData.invoiceStatus).toBe('UNPAID')
      expect(revData.netPaidCents).toBe(0)

      // Clean up test invoice & structure
      await prisma.feePayment.updateMany({
        where: { invoiceId: invoice.dbId },
        data: { reversedPaymentId: null },
      })
      await prisma.feePayment.deleteMany({ where: { invoiceId: invoice.dbId } })
      await prisma.feeInvoice.delete({ where: { id: invoice.dbId } })
      const structData = await structRes.json()
      await prisma.feeStructure.delete({ where: { id: structData.structure.id } })

      // 6. Verify Dashboard & Invoices Summary Ledger Reconciliation
      const [invSummaryRes, dashRes, csvReportRes] = await Promise.all([
        getInvoices(await makeAuthedRequest('http://localhost:3000/api/fees/invoices', 'admin@school.demo')),
        getDashboard(await makeAuthedRequest('http://localhost:3000/api/dashboard', 'admin@school.demo')),
        getReports(
          await makeAuthedRequest(
            'http://localhost:3000/api/reports?type=outstanding-fees&format=csv',
            'admin@school.demo',
          ),
        ),
      ])
      const invSummary = (await invSummaryRes.json()).summary
      const dashData = await dashRes.json()
      expect(invSummary.totalInvoicedCents).toBe(
        invSummary.totalCollectedCents + invSummary.totalOutstandingCents,
      )
      expect(dashData.stats.feesCollected).toBe(invSummary.totalCollected)
      expect(csvReportRes.status).toBe(200)
      expect(csvReportRes.headers.get('content-type')).toContain('text/csv')
    })
  })
})
