import { describe, it, expect, beforeAll } from 'vitest';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { GET as studentsGet, POST as studentsPost } from '@/app/api/students/route';
import { GET as studentByIdGet } from '@/app/api/students/[id]/route';
import { GET as teachersGet } from '@/app/api/teachers/route';
import { POST as classesPost } from '@/app/api/classes/route';
import { POST as subjectsPost } from '@/app/api/subjects/route';
import { POST as assignmentsPost } from '@/app/api/assignments/route';
import { GET as attendanceGet, POST as attendancePost } from '@/app/api/attendance/route';
import { GET as examsGet } from '@/app/api/exams/route';
import { POST as marksPost } from '@/app/api/marks/route';
import { GET as resultsGet } from '@/app/api/results/route';
import { GET as invoicesGet, POST as invoicesPost } from '@/app/api/fees/invoices/route';
import { POST as paymentsPost } from '@/app/api/fees/payments/route';
import { PATCH as profilePatch } from '@/app/api/profile/route';
import { evaluateGradeFromBands, getGradeBands } from '@/lib/server/grading';
import { prisma } from '@/lib/server/prisma';
async function loginAs(email, role) {
    const res = await loginPost(new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            host: 'localhost:3000',
            origin: 'http://localhost:3000',
        },
        body: JSON.stringify({ role, email, password: 'Demo@1234', remember: true }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
    const cookie = rawCookies.map((c) => c.split(';')[0]).join('; ');
    return { cookie, csrfToken: body.csrfToken };
}
function authedRequest(url, auth, options = {}) {
    return new Request(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            host: 'localhost:3000',
            origin: 'http://localhost:3000',
            cookie: auth.cookie,
            'x-csrf-token': auth.csrfToken,
            ...(options.headers || {}),
        },
    });
}
describe('Comprehensive Backend Security & Business Invariants Suite', () => {
    let adminAuth;
    let teacherAuth;
    let guardianAuth;
    beforeAll(async () => {
        adminAuth = await loginAs('admin@school.demo', 'admin');
        teacherAuth = await loginAs('teacher@school.demo', 'teacher');
        guardianAuth = await loginAs('guardian@school.demo', 'guardian');
    });
    it('1. Teacher requesting an unassigned class or student (by URL or payload) is denied with 404', async () => {
        // teacher@school.demo is assigned ONLY to Grade 10 (sections A & B).
        // STU-24017 (Phoenix Baker) is in Grade 9 · Section B, which is NOT assigned to teacher@school.demo.
        const unassignedStudentRes = await studentByIdGet(authedRequest('http://localhost:3000/api/students/STU-24017', teacherAuth), { params: Promise.resolve({ id: 'STU-24017' }) });
        expect(unassignedStudentRes.status).toBe(404);
        // Find a Grade 9 section ID and verify teacher cannot query its students or mark attendance
        const grade9Section = await prisma.section.findFirst({
            where: { schoolClass: { name: 'Grade 9' } },
        });
        expect(grade9Section).toBeTruthy();
        const unassignedSectionRes = await studentsGet(authedRequest(`http://localhost:3000/api/students?sectionId=${grade9Section.id}`, teacherAuth));
        expect(unassignedSectionRes.status).toBe(404);
        const unassignedAttendancePost = await attendancePost(authedRequest('http://localhost:3000/api/attendance', teacherAuth, {
            method: 'POST',
            body: JSON.stringify({
                sectionId: grade9Section.id,
                records: [{ studentId: 'STU-24017', status: 'PRESENT' }],
            }),
        }));
        expect(unassignedAttendancePost.status).toBe(404);
    });
    it("2. Guardian requesting another family's student is denied with 404", async () => {
        // guardian@school.demo is linked ONLY to STU-24018 (Olivia Rhye) and STU-24017 (Phoenix Baker).
        // STU-24016 (Lana Steiner) belongs to another family.
        const otherChildRes = await studentByIdGet(authedRequest('http://localhost:3000/api/students/STU-24016', guardianAuth), { params: Promise.resolve({ id: 'STU-24016' }) });
        expect(otherChildRes.status).toBe(404);
        const otherChildAttendanceRes = await attendanceGet(authedRequest('http://localhost:3000/api/attendance?studentId=STU-24016', guardianAuth));
        expect(otherChildAttendanceRes.status).toBe(404);
        const otherChildResultsRes = await resultsGet(authedRequest('http://localhost:3000/api/results?studentId=STU-24016', guardianAuth));
        expect(otherChildResultsRes.status).toBe(404);
    });
    it('3. Teacher or guardian calling admin endpoints is denied with 403', async () => {
        // Teacher calling GET /api/teachers (admin-only)
        const teacherListRes = await teachersGet(authedRequest('http://localhost:3000/api/teachers', teacherAuth));
        expect(teacherListRes.status).toBe(403);
        // Teacher calling GET /api/fees/invoices (teachers must never see fee data -> 403)
        const teacherFeesRes = await invoicesGet(authedRequest('http://localhost:3000/api/fees/invoices', teacherAuth));
        expect(teacherFeesRes.status).toBe(403);
        // Guardian calling POST /api/students (admin-only)
        const guardianCreateStudentRes = await studentsPost(authedRequest('http://localhost:3000/api/students', guardianAuth, {
            method: 'POST',
            body: JSON.stringify({
                name: 'Unauthorized Student',
                classId: 'cls-1',
                sectionId: 'sec-1',
            }),
        }));
        expect(guardianCreateStudentRes.status).toBe(403);
    });
    it('4. Duplicate attendance on (student, date, session) is rejected with 409', async () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        // Clean any existing today record for STU-24018 in TEST_SESSION
        const st = await prisma.student.findUnique({ where: { studentCode: 'STU-24018' } });
        expect(st).toBeTruthy();
        await prisma.attendanceRecord.deleteMany({
            where: { studentId: st.id, session: 'MORNING_TEST' },
        });
        // First submission succeeds
        const firstRes = await attendancePost(authedRequest('http://localhost:3000/api/attendance', teacherAuth, {
            method: 'POST',
            body: JSON.stringify({
                date: todayStr,
                session: 'MORNING_TEST',
                allowUpdate: false,
                records: [{ studentId: 'STU-24018', status: 'PRESENT' }],
            }),
        }));
        expect(firstRes.status).toBe(200);
        // Second submission with allowUpdate=false is rejected with 409
        const duplicateRes = await attendancePost(authedRequest('http://localhost:3000/api/attendance', teacherAuth, {
            method: 'POST',
            body: JSON.stringify({
                date: todayStr,
                session: 'MORNING_TEST',
                allowUpdate: false,
                records: [{ studentId: 'STU-24018', status: 'ABSENT' }],
            }),
        }));
        expect(duplicateRes.status).toBe(409);
        // Teacher attempting to mark historical attendance is rejected with 403
        const historicalTeacherRes = await attendancePost(authedRequest('http://localhost:3000/api/attendance', teacherAuth, {
            method: 'POST',
            body: JSON.stringify({
                date: '2026-09-15',
                session: 'DAILY',
                allowUpdate: true,
                records: [{ studentId: 'STU-24018', status: 'PRESENT' }],
            }),
        }));
        expect(historicalTeacherRes.status).toBe(403);
    });
    it('5. Marks above maxMarks or negative are rejected with 400', async () => {
        const draftExam = await prisma.exam.findFirst({ where: { status: 'DRAFT' } });
        expect(draftExam).toBeTruthy();
        const overMaxRes = await marksPost(authedRequest('http://localhost:3000/api/marks', teacherAuth, {
            method: 'POST',
            body: JSON.stringify({
                examId: draftExam.id,
                entries: [{ studentId: 'STU-24018', marksObtained: 105 }],
            }),
        }));
        expect(overMaxRes.status).toBe(400);
        const negativeRes = await marksPost(authedRequest('http://localhost:3000/api/marks', teacherAuth, {
            method: 'POST',
            body: JSON.stringify({
                examId: draftExam.id,
                entries: [{ studentId: 'STU-24018', marksObtained: -5 }],
            }),
        }));
        expect(negativeRes.status).toBe(400);
    });
    it('6. Unpublished results are never visible to guardians', async () => {
        const draftExam = await prisma.exam.findFirst({ where: { status: 'DRAFT' } });
        expect(draftExam).toBeTruthy();
        // Enter a draft mark of 93 for STU-24018 (Olivia Rhye) in the DRAFT exam
        const saveDraftRes = await marksPost(authedRequest('http://localhost:3000/api/marks', teacherAuth, {
            method: 'POST',
            body: JSON.stringify({
                examId: draftExam.id,
                status: 'DRAFT',
                entries: [{ studentId: 'STU-24018', marksObtained: 93 }],
            }),
        }));
        expect(saveDraftRes.status).toBe(200);
        // Guardian fetches results for STU-24018 -> must NOT contain any marks from draftExam
        const guardianRes = await resultsGet(authedRequest('http://localhost:3000/api/results?studentId=STU-24018', guardianAuth));
        expect(guardianRes.status).toBe(200);
        const data = await guardianRes.json();
        const oliviaResult = data.results.find((r) => r.studentId === 'STU-24018');
        expect(oliviaResult).toBeTruthy();
        const hasDraftExam = oliviaResult.subjects.some((s) => s.examId === draftExam.id || s.status !== 'PUBLISHED');
        expect(hasDraftExam).toBe(false);
        // Also guardian GET /api/exams must only return PUBLISHED exams
        const guardianExamsRes = await examsGet(authedRequest('http://localhost:3000/api/exams', guardianAuth));
        const examsData = await guardianExamsRes.json();
        expect(examsData.exams.every((e) => e.status === 'PUBLISHED')).toBe(true);
    });
    it('7. A user cannot change their own role or account status', async () => {
        const changeRoleRes = await profilePatch(authedRequest('http://localhost:3000/api/profile', teacherAuth, {
            method: 'PATCH',
            body: JSON.stringify({ role: 'admin', name: 'Hacked Admin' }),
        }));
        expect(changeRoleRes.status).toBe(403);
        const changeStatusRes = await profilePatch(authedRequest('http://localhost:3000/api/profile', guardianAuth, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'INACTIVE' }),
        }));
        expect(changeStatusRes.status).toBe(403);
    });
    it('8. Overpayment is rejected, partial payments work, and concurrent payments on the same invoice stay consistent', async () => {
        // Create a fresh $1,000.00 (100000 cents) invoice for STU-24018
        const createInvRes = await invoicesPost(authedRequest('http://localhost:3000/api/fees/invoices', adminAuth, {
            method: 'POST',
            body: JSON.stringify({
                studentId: 'STU-24018',
                title: 'Concurrency & Ledger Test Invoice',
                amountCents: 100000,
                dueDate: '2026-11-30',
            }),
        }));
        expect(createInvRes.status).toBe(201);
        const { invoice } = await createInvRes.json();
        // Overpayment ($1,500 on $1,000 invoice) is rejected with 400
        const overpayRes = await paymentsPost(authedRequest('http://localhost:3000/api/fees/payments', adminAuth, {
            method: 'POST',
            body: JSON.stringify({
                invoiceId: invoice.id,
                amountCents: 150000,
                method: 'CARD',
            }),
        }));
        expect(overpayRes.status).toBe(400);
        // Partial payment of $400 (40000 cents) -> status becomes PARTIAL
        const partialRes = await paymentsPost(authedRequest('http://localhost:3000/api/fees/payments', adminAuth, {
            method: 'POST',
            body: JSON.stringify({
                invoiceId: invoice.id,
                amountCents: 40000,
                method: 'BANK_TRANSFER',
            }),
        }));
        expect(partialRes.status).toBe(201);
        const partialData = await partialRes.json();
        expect(partialData.invoice.rawStatus).toBe('PARTIAL');
        expect(partialData.invoice.paidCents).toBe(40000);
        expect(partialData.invoice.outstandingCents).toBe(60000);
        // Fire two concurrent $600 (60000 cents) payments against the remaining $600 balance.
        // Exactly ONE must succeed (status 201) and the other must be rejected (status 400 or 409) so total paid never exceeds 100000 cents!
        const [conc1, conc2] = await Promise.all([
            paymentsPost(authedRequest('http://localhost:3000/api/fees/payments', adminAuth, {
                method: 'POST',
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    amountCents: 60000,
                    method: 'CARD',
                }),
            })),
            paymentsPost(authedRequest('http://localhost:3000/api/fees/payments', guardianAuth, {
                method: 'POST',
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    amountCents: 60000,
                    method: 'CARD',
                }),
            })),
        ]);
        const statuses = [conc1.status, conc2.status].sort();
        expect(statuses[0]).toBe(201);
        expect([400, 409]).toContain(statuses[1]);
        // Verify ledger reconciliation: paid + outstanding === totalCents, and status === PAID
        const checkInvRes = await invoicesGet(authedRequest(`http://localhost:3000/api/fees/invoices?search=${invoice.id}`, adminAuth));
        const checkData = await checkInvRes.json();
        const finalInv = checkData.invoices.find((i) => i.id === invoice.id);
        expect(finalInv).toBeTruthy();
        expect(finalInv.paidCents).toBe(100000);
        expect(finalInv.outstandingCents).toBe(0);
        expect(finalInv.paidCents + finalInv.outstandingCents).toBe(finalInv.totalCents);
        expect(finalInv.rawStatus).toBe('PAID');
    });
    it('9. Grade calculation follows configured database bands', async () => {
        const bands = await getGradeBands();
        expect(bands.length).toBeGreaterThanOrEqual(7);
        expect(evaluateGradeFromBands(97, bands).grade).toBe('A+');
        expect(evaluateGradeFromBands(92, bands).grade).toBe('A');
        expect(evaluateGradeFromBands(88, bands).grade).toBe('A−');
        expect(evaluateGradeFromBands(83, bands).grade).toBe('B+');
        expect(evaluateGradeFromBands(75, bands).grade).toBe('B');
        expect(evaluateGradeFromBands(60, bands).grade).toBe('C');
        expect(evaluateGradeFromBands(45, bands).grade).toBe('D');
        const failEval = evaluateGradeFromBands(32, bands);
        expect(failEval.grade).toBe('F');
        expect(failEval.isPassing).toBe(false);
    });
    it('10. Cross-role consistency: Admin creates class, section, subject, teacher, guardian, student, and assignment; Teacher and Guardian immediately see scoped data', async () => {
        const suffix = Date.now().toString().slice(-5);
        // 1. Admin creates a class + section
        const clsRes = await classesPost(authedRequest('http://localhost:3000/api/classes', adminAuth, {
            method: 'POST',
            body: JSON.stringify({
                name: 'Grade 10',
                gradeLevel: 10,
                sectionName: `Z${suffix}`,
                room: 'Lab 404',
                capacity: 30,
            }),
        }));
        expect(clsRes.status).toBe(201);
        const { schoolClass, section } = await clsRes.json();
        // 2. Admin creates a subject
        const subRes = await subjectsPost(authedRequest('http://localhost:3000/api/subjects', adminAuth, {
            method: 'POST',
            body: JSON.stringify({
                code: `AST-${suffix}`,
                name: `Astrophysics ${suffix}`,
                department: 'Science',
                classIds: [schoolClass.id],
            }),
        }));
        expect(subRes.status).toBe(201);
        const { subject } = await subRes.json();
        // 3. Admin assigns teacher@school.demo to this new section + subject
        const asgRes = await assignmentsPost(authedRequest('http://localhost:3000/api/assignments', adminAuth, {
            method: 'POST',
            body: JSON.stringify({
                teacherId: 'TCH-1001',
                sectionId: section.id,
                subjectId: subject.dbId,
                scheduleTime: '03:15',
                scheduleRoom: 'Lab 404',
            }),
        }));
        expect(asgRes.status).toBe(201);
        // 4. Admin creates a new student in that section linked to guardian@school.demo (GRD-3001)
        const guardianProfile = await prisma.guardianProfile.findUnique({
            where: { guardianCode: 'GRD-3001' },
        });
        const stuRes = await studentsPost(authedRequest('http://localhost:3000/api/students', adminAuth, {
            method: 'POST',
            body: JSON.stringify({
                name: `Test Learner ${suffix}`,
                classId: schoolClass.id,
                sectionId: section.id,
                program: 'Science',
                guardianId: guardianProfile.id,
            }),
        }));
        expect(stuRes.status).toBe(201);
        const { student } = await stuRes.json();
        // 5. Teacher immediately sees the new student in their assigned section
        const teacherCheckRes = await studentsGet(authedRequest(`http://localhost:3000/api/students?sectionId=${section.id}`, teacherAuth));
        expect(teacherCheckRes.status).toBe(200);
        const teacherCheckData = await teacherCheckRes.json();
        expect(teacherCheckData.students.some((s) => s.id === student.id)).toBe(true);
        // 6. Guardian immediately sees the new linked child
        const guardianCheckRes = await studentByIdGet(authedRequest(`http://localhost:3000/api/students/${student.id}`, guardianAuth), { params: Promise.resolve({ id: student.id }) });
        expect(guardianCheckRes.status).toBe(200);
        // Clean up test student & section so seed state stays tidy
        await prisma.student.delete({ where: { id: student.dbId } });
        await prisma.section.delete({ where: { id: section.id } });
        await prisma.subject.delete({ where: { id: subject.dbId } });
    });
});
