import { NextResponse } from '../../utils/http';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { getGuardianScope, getTeacherScope, handleApiError, HttpError, requireSession, } from '../../utils/rbac';
import { logAudit } from '../../utils/audit';
const createStudentSchema = z.object({
    name: z.string().trim().min(2, 'Student name is required.'),
    email: z.string().trim().email('Valid email is required.').optional(),
    studentCode: z.string().trim().optional(),
    classId: z.string().min(1, 'Class is required.'),
    sectionId: z.string().min(1, 'Section is required.'),
    program: z.string().trim().min(1).default('Science'),
    status: z.enum(['ACTIVE', 'REVIEW', 'INACTIVE']).default('ACTIVE'),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    guardianId: z.string().optional(),
});
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'ST';
}
export async function GET(request) {
    try {
        const session = await requireSession(request, ['admin', 'teacher', 'guardian']);
        const url = new URL(request.url);
        const search = (url.searchParams.get('search') || '').trim();
        const filter = url.searchParams.get('filter') || 'All';
        const classId = url.searchParams.get('classId') || '';
        const sectionId = url.searchParams.get('sectionId') || '';
        const sortBy = url.searchParams.get('sortBy') || 'name';
        const sortOrder = url.searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
        const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
        const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') || '50')));
        // Build scope filter on the server
        const where = {};
        if (session.role === 'teacher') {
            const scope = await getTeacherScope(session.userId);
            if (sectionId && !scope.sectionIds.includes(sectionId)) {
                throw new HttpError(404, 'Section not found.');
            }
            if (classId && !scope.classIds.includes(classId)) {
                throw new HttpError(404, 'Class not found.');
            }
            where.sectionId = sectionId ? sectionId : { in: scope.sectionIds };
        }
        else if (session.role === 'guardian') {
            const scope = await getGuardianScope(session.userId);
            where.id = { in: scope.studentIds };
        }
        else {
            if (sectionId)
                where.sectionId = sectionId;
            if (classId)
                where.classId = classId;
        }
        if (filter === 'Active')
            where.status = 'ACTIVE';
        else if (filter === 'Review')
            where.status = 'REVIEW';
        else if (filter === 'Grade 10') {
            where.schoolClass = { name: { contains: '10', mode: 'insensitive' } };
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { studentCode: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { program: { contains: search, mode: 'insensitive' } },
                { schoolClass: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [total, students] = await Promise.all([
            prisma.student.count({ where }),
            prisma.student.findMany({
                where,
                include: {
                    schoolClass: true,
                    section: true,
                    attendance: {
                        select: { status: true },
                    },
                    guardians: {
                        include: {
                            guardian: {
                                include: { user: { select: { id: true, name: true, email: true, phone: true } } },
                            },
                        },
                    },
                },
                orderBy: sortBy === 'studentCode'
                    ? { studentCode: sortOrder }
                    : sortBy === 'createdAt'
                        ? { createdAt: sortOrder }
                        : { name: sortOrder },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        const records = students.map((st) => {
            const totalAtt = st.attendance.length;
            const presentAtt = st.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
            const pct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;
            return {
                id: st.studentCode,
                dbId: st.id,
                name: st.name,
                email: st.email,
                initials: st.initials,
                grade: `${st.schoolClass.name} · ${st.section.name}`,
                classId: st.classId,
                className: st.schoolClass.name,
                sectionId: st.sectionId,
                sectionName: st.section.name,
                program: st.program,
                attendance: `${pct}%`,
                attendancePct: pct,
                status: st.status === 'REVIEW' ? 'Review' : 'Active',
                rawStatus: st.status,
                guardians: session.role === 'teacher'
                    ? [] // Teachers do not see unrelated guardian details
                    : st.guardians.map((g) => ({
                        id: g.guardian.id,
                        name: g.guardian.user.name,
                        email: g.guardian.user.email,
                        relationship: g.relationship,
                    })),
            };
        });
        return NextResponse.json({
            students: records,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.max(1, Math.ceil(total / pageSize)),
            },
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
        const data = createStudentSchema.parse(body);
        const section = await prisma.section.findUnique({
            where: { id: data.sectionId },
            include: { schoolClass: true },
        });
        if (!section || section.classId !== data.classId) {
            throw new HttpError(400, 'Selected section does not belong to the selected class.');
        }
        const count = await prisma.student.count();
        const studentCode = data.studentCode?.trim() || `STU-${24100 + count + 1}`;
        const email = data.email?.trim().toLowerCase() ||
            `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${count + 1}@school.demo`;
        const student = await prisma.student.create({
            data: {
                studentCode,
                name: data.name,
                email,
                initials: initialsFromName(data.name),
                program: data.program,
                status: data.status,
                classId: data.classId,
                sectionId: data.sectionId,
                gender: data.gender || 'Female',
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('2010-05-15'),
                ...(data.guardianId
                    ? {
                        guardians: {
                            create: {
                                guardianId: data.guardianId,
                                relationship: 'Parent',
                                isPrimary: true,
                            },
                        },
                    }
                    : {}),
            },
            include: {
                schoolClass: true,
                section: true,
            },
        });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'STUDENT_CREATED',
            entityType: 'Student',
            entityId: student.studentCode,
            afterSummary: `Created student ${student.name} (${student.studentCode}) in ${student.schoolClass.name} · ${student.section.name}`,
        });
        return NextResponse.json({
            student: {
                id: student.studentCode,
                dbId: student.id,
                name: student.name,
                email: student.email,
                initials: student.initials,
                grade: `${student.schoolClass.name} · ${student.section.name}`,
                classId: student.classId,
                sectionId: student.sectionId,
                program: student.program,
                attendance: '100%',
                status: student.status === 'REVIEW' ? 'Review' : 'Active',
            },
        }, { status: 201 });
    }
    catch (error) {
        return handleApiError(error);
    }
}
