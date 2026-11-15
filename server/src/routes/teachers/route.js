import { NextResponse } from '../../utils/http';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { hashPassword } from '../../utils/auth';
import { handleApiError, HttpError, requireSession } from '../../utils/rbac';
import { logAudit } from '../../utils/audit';
const createTeacherSchema = z.object({
    name: z.string().trim().min(2, 'Teacher name is required.'),
    email: z.string().trim().email('Valid email is required.'),
    department: z.string().trim().min(1).default('Science'),
    qualification: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    password: z.string().min(6).optional().default('Demo@1234'),
});
const updateTeacherSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(2).optional(),
    department: z.string().trim().min(1).optional(),
    qualification: z.string().trim().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'TC';
}
export async function GET(request) {
    try {
        await requireSession(request, ['admin']);
        const url = new URL(request.url);
        const search = (url.searchParams.get('search') || '').trim();
        const where = {};
        if (search) {
            where.OR = [
                { employeeCode: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const teachers = await prisma.teacherProfile.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true, initials: true, status: true, phone: true } },
                assignments: {
                    include: {
                        schoolClass: true,
                        section: true,
                        subject: true,
                    },
                },
            },
            orderBy: { user: { name: 'asc' } },
        });
        return NextResponse.json({
            teachers: teachers.map((t) => ({
                id: t.employeeCode,
                dbId: t.id,
                userId: t.user.id,
                name: t.user.name,
                email: t.user.email,
                initials: t.user.initials,
                department: t.department,
                qualification: t.qualification || 'M.Ed.',
                phone: t.user.phone || '—',
                status: t.user.status === 'ACTIVE' ? 'Active' : 'Review',
                assignmentCount: t.assignments.length,
                assignments: t.assignments.map((a) => ({
                    id: a.id,
                    className: a.schoolClass.name,
                    sectionName: a.section.name,
                    subjectName: a.subject.name,
                    scheduleTime: a.scheduleTime,
                    scheduleRoom: a.scheduleRoom,
                })),
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
        const data = createTeacherSchema.parse(body);
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email.toLowerCase() },
        });
        if (existingUser) {
            throw new HttpError(400, 'An account with this email already exists.');
        }
        const count = await prisma.teacherProfile.count();
        const employeeCode = `TCH-${1010 + count + 1}`;
        const passwordHash = await hashPassword(data.password);
        const createdUser = await prisma.user.create({
            data: {
                email: data.email.toLowerCase(),
                passwordHash,
                name: data.name,
                initials: initialsFromName(data.name),
                role: 'TEACHER',
                status: 'ACTIVE',
                phone: data.phone || '+1 (555) 200-9999',
                teacherProfile: {
                    create: {
                        employeeCode,
                        department: data.department,
                        qualification: data.qualification || 'M.Ed.',
                    },
                },
            },
            include: { teacherProfile: true },
        });
        const tp = createdUser.teacherProfile;
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'TEACHER_CREATED',
            entityType: 'Teacher',
            entityId: tp.employeeCode,
            afterSummary: `Created teacher ${createdUser.name} (${tp.department}, ${createdUser.email})`,
        });
        return NextResponse.json({
            teacher: {
                id: tp.employeeCode,
                dbId: tp.id,
                userId: createdUser.id,
                name: createdUser.name,
                email: createdUser.email,
                initials: createdUser.initials,
                department: tp.department,
                qualification: tp.qualification,
                status: 'Active',
                assignmentCount: 0,
                assignments: [],
            },
        }, { status: 201 });
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function PATCH(request) {
    try {
        const session = await requireSession(request, ['admin']);
        const body = await request.json();
        const data = updateTeacherSchema.parse(body);
        const existing = await prisma.teacherProfile.findFirst({
            where: { OR: [{ id: data.id }, { employeeCode: data.id }] },
            include: { user: true },
        });
        if (!existing) {
            throw new HttpError(404, 'Teacher record not found.');
        }
        const updated = await prisma.teacherProfile.update({
            where: { id: existing.id },
            data: {
                ...(data.department ? { department: data.department } : {}),
                ...(data.qualification ? { qualification: data.qualification } : {}),
                user: {
                    update: {
                        ...(data.name ? { name: data.name } : {}),
                        ...(data.status ? { status: data.status } : {}),
                    },
                },
            },
            include: { user: true },
        });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'TEACHER_UPDATED',
            entityType: 'Teacher',
            entityId: updated.employeeCode,
            beforeSummary: `${existing.user.name} (${existing.department})`,
            afterSummary: `${updated.user.name} (${updated.department})`,
        });
        return NextResponse.json({
            teacher: {
                id: updated.employeeCode,
                dbId: updated.id,
                name: updated.user.name,
                email: updated.user.email,
                department: updated.department,
                status: updated.user.status === 'ACTIVE' ? 'Active' : 'Review',
            },
        });
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
            throw new HttpError(400, 'Teacher ID is required.');
        const existing = await prisma.teacherProfile.findFirst({
            where: { OR: [{ id }, { employeeCode: id }] },
            include: { user: true, _count: { select: { assignments: true } } },
        });
        if (!existing) {
            throw new HttpError(404, 'Teacher record not found.');
        }
        const dependentAttendance = await prisma.attendanceRecord.count({
            where: { markedById: existing.userId },
        });
        const dependentMarks = await prisma.markEntry.count({
            where: { enteredById: existing.userId },
        });
        if (dependentAttendance > 0 || dependentMarks > 0) {
            throw new HttpError(409, 'Cannot delete teacher with historical attendance or mark entries; set status to INACTIVE instead.');
        }
        await prisma.user.delete({ where: { id: existing.userId } });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'TEACHER_DELETED',
            entityType: 'Teacher',
            entityId: existing.employeeCode,
            beforeSummary: `${existing.user.name} (${existing.employeeCode})`,
            afterSummary: 'Deleted',
        });
        return NextResponse.json({ ok: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
