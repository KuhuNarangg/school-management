import { NextResponse } from '../../utils/http';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { getTeacherScope, handleApiError, HttpError, requireSession } from '../../utils/rbac';
import { logAudit } from '../../utils/audit';
const createAssignmentSchema = z.object({
    teacherId: z.string().min(1, 'Teacher is required.'),
    sectionId: z.string().min(1, 'Section is required.'),
    subjectId: z.string().min(1, 'Subject is required.'),
    scheduleTime: z.string().trim().min(1).default('09:00'),
    scheduleRoom: z.string().trim().min(1).default('Room 204'),
    isHomeroom: z.boolean().optional().default(false),
});
export async function GET(request) {
    try {
        const session = await requireSession(request, ['admin', 'teacher']);
        let where = {};
        if (session.role === 'teacher') {
            const scope = await getTeacherScope(session.userId);
            where = { teacherId: scope.teacherProfileId || '__none__' };
        }
        const assignments = await prisma.teacherAssignment.findMany({
            where,
            include: {
                teacher: { include: { user: { select: { id: true, name: true, email: true, initials: true } } } },
                schoolClass: true,
                section: true,
                subject: true,
            },
            orderBy: [{ schoolClass: { gradeLevel: 'asc' } }, { section: { name: 'asc' } }],
        });
        return NextResponse.json({
            assignments: assignments.map((a) => ({
                id: a.id,
                teacherId: a.teacher.id,
                teacherCode: a.teacher.employeeCode,
                teacherName: a.teacher.user.name,
                teacherEmail: a.teacher.user.email,
                teacherInitials: a.teacher.user.initials,
                classId: a.classId,
                className: a.schoolClass.name,
                sectionId: a.sectionId,
                sectionName: a.section.name,
                grade: `${a.schoolClass.name} · ${a.section.name}`,
                subjectId: a.subjectId,
                subjectCode: a.subject.code,
                subjectName: a.subject.name,
                scheduleTime: a.scheduleTime,
                scheduleRoom: a.scheduleRoom,
                isHomeroom: a.isHomeroom,
            })),
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        const session = await requireSession(request, ['admin']);
        const body = await request.json();
        const data = createAssignmentSchema.parse(body);
        const teacher = await prisma.teacherProfile.findFirst({
            where: { OR: [{ id: data.teacherId }, { employeeCode: data.teacherId }] },
            include: { user: true },
        });
        if (!teacher) {
            throw new HttpError(404, 'Teacher not found.');
        }
        const section = await prisma.section.findUnique({
            where: { id: data.sectionId },
            include: { schoolClass: true },
        });
        if (!section) {
            throw new HttpError(404, 'Section not found.');
        }
        const subject = await prisma.subject.findFirst({
            where: { OR: [{ id: data.subjectId }, { code: data.subjectId }] },
        });
        if (!subject) {
            throw new HttpError(404, 'Subject not found.');
        }
        // Ensure class-subject mapping exists
        await prisma.classSubject.upsert({
            where: {
                classId_subjectId: {
                    classId: section.classId,
                    subjectId: subject.id,
                },
            },
            update: {},
            create: {
                classId: section.classId,
                subjectId: subject.id,
            },
        });
        // Ensure open (DRAFT/SUBMITTED) exams have an ExamSubject paper for this (classId, subjectId)
        const openExams = await prisma.exam.findMany({
            where: { status: { in: ['DRAFT', 'SUBMITTED'] }, locked: false },
        });
        for (const openExam of openExams) {
            await prisma.examSubject.upsert({
                where: {
                    examId_classId_subjectId: {
                        examId: openExam.id,
                        classId: section.classId,
                        subjectId: subject.id,
                    },
                },
                update: {},
                create: {
                    examId: openExam.id,
                    classId: section.classId,
                    subjectId: subject.id,
                    maxMarks: subject.maxMarksDefault,
                    passingMarks: subject.passingMarksDefault,
                    examDate: openExam.startDate,
                },
            });
        }
        // Upsert assignment on (sectionId, subjectId) so changing teacher assignment updates access immediately
        const existing = await prisma.teacherAssignment.findUnique({
            where: {
                sectionId_subjectId: {
                    sectionId: section.id,
                    subjectId: subject.id,
                },
            },
            include: { teacher: { include: { user: true } } },
        });
        const assignment = await prisma.teacherAssignment.upsert({
            where: {
                sectionId_subjectId: {
                    sectionId: section.id,
                    subjectId: subject.id,
                },
            },
            update: {
                teacherId: teacher.id,
                classId: section.classId,
                scheduleTime: data.scheduleTime,
                scheduleRoom: data.scheduleRoom,
                isHomeroom: data.isHomeroom,
            },
            create: {
                teacherId: teacher.id,
                classId: section.classId,
                sectionId: section.id,
                subjectId: subject.id,
                scheduleTime: data.scheduleTime,
                scheduleRoom: data.scheduleRoom,
                isHomeroom: data.isHomeroom,
            },
            include: {
                teacher: { include: { user: true } },
                schoolClass: true,
                section: true,
                subject: true,
            },
        });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: existing ? 'ASSIGNMENT_UPDATED' : 'ASSIGNMENT_CREATED',
            entityType: 'TeacherAssignment',
            entityId: assignment.id,
            beforeSummary: existing
                ? `${existing.teacher.user.name} -> ${section.schoolClass.name}·${section.name} (${subject.name})`
                : null,
            afterSummary: `${teacher.user.name} -> ${section.schoolClass.name}·${section.name} (${subject.name})`,
        });
        return NextResponse.json({
            assignment: {
                id: assignment.id,
                teacherId: assignment.teacher.id,
                teacherCode: assignment.teacher.employeeCode,
                teacherName: assignment.teacher.user.name,
                teacherEmail: assignment.teacher.user.email,
                className: assignment.schoolClass.name,
                sectionName: assignment.section.name,
                grade: `${assignment.schoolClass.name} · ${assignment.section.name}`,
                subjectName: assignment.subject.name,
                scheduleTime: assignment.scheduleTime,
                scheduleRoom: assignment.scheduleRoom,
            },
        }, { status: 201 });
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function DELETE(request) {
    try {
        const session = await requireSession(request, ['admin']);
        const url = new URL(request.url);
        const id = url.searchParams.get('id') || '';
        if (!id)
            throw new HttpError(400, 'Assignment ID is required.');
        const existing = await prisma.teacherAssignment.findUnique({
            where: { id },
            include: {
                teacher: { include: { user: true } },
                schoolClass: true,
                section: true,
                subject: true,
            },
        });
        if (!existing) {
            throw new HttpError(404, 'Assignment not found.');
        }
        await prisma.teacherAssignment.delete({ where: { id } });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'ASSIGNMENT_DELETED',
            entityType: 'TeacherAssignment',
            entityId: id,
            beforeSummary: `${existing.teacher.user.name} -> ${existing.schoolClass.name}·${existing.section.name} (${existing.subject.name})`,
            afterSummary: 'Deleted',
        });
        return NextResponse.json({ ok: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
