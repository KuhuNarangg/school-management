import { NextResponse } from '../../utils/http';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { getTeacherScope, handleApiError, HttpError, requireSession } from '../../utils/rbac';
import { logAudit } from '../../utils/audit';
const createExamSchema = z.object({
    name: z.string().trim().min(2, 'Examination name is required.'),
    term: z.string().trim().min(1).default('Term 2'),
    startDate: z.string().optional().default('2026-11-15'),
    endDate: z.string().optional().default('2026-11-22'),
    maxMarks: z.coerce.number().int().min(10).max(500).default(100),
    passingMarks: z.coerce.number().int().min(1).max(500).default(40),
    classIds: z.array(z.string()).optional().default([]),
    subjectIds: z.array(z.string()).optional().default([]),
});
const patchExamSchema = z.object({
    examId: z.string().min(1),
    action: z.enum(['PUBLISH', 'UNLOCK', 'SUBMIT']),
    reason: z.string().trim().optional(),
});
export async function GET(request) {
    try {
        const session = await requireSession(request, ['admin', 'teacher', 'guardian']);
        const where = {};
        if (session.role === 'guardian') {
            where.status = 'PUBLISHED';
        }
        const exams = await prisma.exam.findMany({
            where,
            include: {
                examSubjects: {
                    include: {
                        schoolClass: true,
                        subject: true,
                        _count: { select: { marks: true } },
                    },
                },
            },
            orderBy: { startDate: 'desc' },
        });
        const totalStudents = await prisma.student.count();
        const formatted = exams.map((exam) => {
            const totalMarksEntered = exam.examSubjects.reduce((sum, es) => sum + es._count.marks, 0);
            const expectedMarks = Math.max(1, exam.examSubjects.length * 20);
            const pct = exam.status === 'PUBLISHED' ? 100 : Math.min(99, Math.round((totalMarksEntered / expectedMarks) * 100));
            const classNames = Array.from(new Set(exam.examSubjects.map((es) => es.schoolClass.name)));
            const gradeLabel = classNames.length >= 3
                ? 'Grades 9–11'
                : classNames.length > 0
                    ? classNames.join(', ')
                    : 'All grades';
            const sDate = new Date(exam.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
            const eDate = new Date(exam.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
            return {
                id: exam.id,
                name: exam.name,
                term: exam.term,
                grade: gradeLabel,
                date: sDate === eDate ? sDate : `${sDate} – ${eDate}`,
                startDate: new Date(exam.startDate).toISOString().slice(0, 10),
                endDate: new Date(exam.endDate).toISOString().slice(0, 10),
                completed: `${pct}%`,
                state: exam.status === 'PUBLISHED'
                    ? 'Published'
                    : exam.status === 'SUBMITTED'
                        ? 'Submitted'
                        : 'In progress',
                status: exam.status,
                locked: exam.locked,
                unlockReason: exam.unlockReason,
                examSubjects: exam.examSubjects.map((es) => ({
                    id: es.id,
                    classId: es.classId,
                    className: es.schoolClass.name,
                    subjectId: es.subjectId,
                    subjectCode: es.subject.code,
                    subjectName: es.subject.name,
                    maxMarks: es.maxMarks,
                    passingMarks: es.passingMarks,
                    marksCount: es._count.marks,
                })),
                totalStudents,
            };
        });
        return NextResponse.json({ exams: formatted });
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        const session = await requireSession(request, ['admin']);
        const body = await request.json();
        const data = createExamSchema.parse(body);
        if (data.passingMarks > data.maxMarks) {
            throw new HttpError(400, 'Passing marks cannot exceed maximum marks.');
        }
        let classIds = data.classIds;
        if (classIds.length === 0) {
            const classes = await prisma.schoolClass.findMany({ select: { id: true } });
            classIds = classes.map((c) => c.id);
        }
        let subjectIds = data.subjectIds;
        if (subjectIds.length === 0) {
            const subjects = await prisma.subject.findMany({ select: { id: true } });
            subjectIds = subjects.map((s) => s.id);
        }
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        const exam = await prisma.exam.create({
            data: {
                name: data.name,
                term: data.term,
                startDate,
                endDate,
                status: 'DRAFT',
                locked: false,
                createdById: session.userId,
                examSubjects: {
                    create: classIds.flatMap((classId) => subjectIds.map((subjectId) => ({
                        classId,
                        subjectId,
                        maxMarks: data.maxMarks,
                        passingMarks: data.passingMarks,
                        examDate: startDate,
                    }))),
                },
            },
            include: {
                examSubjects: {
                    include: { schoolClass: true, subject: true },
                },
            },
        });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'EXAM_CREATED',
            entityType: 'Exam',
            entityId: exam.id,
            afterSummary: `Created exam "${exam.name}" (${exam.term}) with ${exam.examSubjects.length} class-subject paper(s)`,
        });
        return NextResponse.json({ exam }, { status: 201 });
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function PATCH(request) {
    try {
        const session = await requireSession(request, ['admin', 'teacher']);
        const body = await request.json();
        const data = patchExamSchema.parse(body);
        const exam = await prisma.exam.findUnique({ where: { id: data.examId } });
        if (!exam) {
            throw new HttpError(404, 'Examination not found.');
        }
        if (data.action === 'SUBMIT') {
            if (exam.locked || exam.status === 'PUBLISHED') {
                throw new HttpError(400, 'Exam is already published and locked.');
            }
            if (session.role === 'teacher') {
                const scope = await getTeacherScope(session.userId);
                await prisma.markEntry.updateMany({
                    where: {
                        examSubject: {
                            examId: exam.id,
                            classId: { in: scope.classIds },
                            subjectId: { in: scope.subjectIds },
                        },
                    },
                    data: { status: 'SUBMITTED' },
                });
            }
            else {
                await prisma.markEntry.updateMany({
                    where: { examSubject: { examId: exam.id } },
                    data: { status: 'SUBMITTED' },
                });
            }
            const updated = await prisma.exam.update({
                where: { id: exam.id },
                data: { status: 'SUBMITTED' },
            });
            await logAudit({
                actorId: session.userId,
                actorName: session.name,
                actorRole: session.role.toUpperCase(),
                action: 'MARKS_SUBMITTED',
                entityType: 'Exam',
                entityId: exam.id,
                beforeSummary: `status=${exam.status}`,
                afterSummary: `status=SUBMITTED (${exam.name})`,
            });
            return NextResponse.json({ exam: updated });
        }
        // PUBLISH and UNLOCK are strictly ADMIN-only
        if (session.role !== 'admin') {
            throw new HttpError(403, 'Only administrators can publish or unlock examination results.');
        }
        if (data.action === 'PUBLISH') {
            const updated = await prisma.$transaction(async (tx) => {
                await tx.markEntry.updateMany({
                    where: { examSubject: { examId: exam.id } },
                    data: { status: 'PUBLISHED' },
                });
                return tx.exam.update({
                    where: { id: exam.id },
                    data: { status: 'PUBLISHED', locked: true },
                });
            });
            await logAudit({
                actorId: session.userId,
                actorName: session.name,
                actorRole: 'ADMIN',
                action: 'RESULT_PUBLISHED',
                entityType: 'Exam',
                entityId: exam.id,
                beforeSummary: `status=${exam.status}, locked=${exam.locked}`,
                afterSummary: `status=PUBLISHED, locked=true (${exam.name})`,
            });
            return NextResponse.json({ exam: updated });
        }
        if (data.action === 'UNLOCK') {
            if (!data.reason || data.reason.length < 3) {
                throw new HttpError(400, 'An unlock reason is required to unlock published results.');
            }
            const updated = await prisma.$transaction(async (tx) => {
                await tx.markEntry.updateMany({
                    where: { examSubject: { examId: exam.id } },
                    data: { status: 'DRAFT', unlockReason: data.reason },
                });
                return tx.exam.update({
                    where: { id: exam.id },
                    data: {
                        status: 'DRAFT',
                        locked: false,
                        unlockReason: data.reason,
                    },
                });
            });
            await logAudit({
                actorId: session.userId,
                actorName: session.name,
                actorRole: 'ADMIN',
                action: 'EXAM_UNLOCKED',
                entityType: 'Exam',
                entityId: exam.id,
                beforeSummary: `status=${exam.status}, locked=${exam.locked}`,
                afterSummary: `status=DRAFT, locked=false · Reason: ${data.reason}`,
            });
            return NextResponse.json({ exam: updated });
        }
        throw new HttpError(400, 'Unsupported action.');
    }
    catch (error) {
        return handleApiError(error);
    }
}
