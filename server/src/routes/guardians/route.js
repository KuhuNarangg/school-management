import { NextResponse } from '../../utils/http';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { hashPassword } from '../../utils/auth';
import { handleApiError, HttpError, requireSession } from '../../utils/rbac';
import { logAudit } from '../../utils/audit';
const createGuardianSchema = z.object({
    name: z.string().trim().min(2, 'Guardian name is required.'),
    email: z.string().trim().email('Valid email is required.'),
    phone: z.string().trim().optional(),
    occupation: z.string().trim().optional(),
    address: z.string().trim().optional(),
    studentIds: z.array(z.string()).optional().default([]),
    password: z.string().min(6).optional().default('Demo@1234'),
});
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'GD';
}
export async function GET(request) {
    try {
        await requireSession(request, ['admin']);
        const url = new URL(request.url);
        const search = (url.searchParams.get('search') || '').trim();
        const where = {};
        if (search) {
            where.OR = [
                { guardianCode: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const guardians = await prisma.guardianProfile.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true, initials: true, status: true, phone: true } },
                students: {
                    include: {
                        student: {
                            include: { schoolClass: true, section: true },
                        },
                    },
                },
            },
            orderBy: { user: { name: 'asc' } },
        });
        return NextResponse.json({
            guardians: guardians.map((g) => ({
                id: g.guardianCode,
                dbId: g.id,
                userId: g.user.id,
                name: g.user.name,
                email: g.user.email,
                initials: g.user.initials,
                phone: g.user.phone || g.emergencyPhone || '—',
                occupation: g.occupation || 'Parent',
                address: g.address || 'Springfield, IL',
                status: g.user.status === 'ACTIVE' ? 'Active' : 'Review',
                childrenCount: g.students.length,
                children: g.students.map((s) => ({
                    id: s.student.studentCode,
                    dbId: s.student.id,
                    name: s.student.name,
                    grade: `${s.student.schoolClass.name} · ${s.student.section.name}`,
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
        const data = createGuardianSchema.parse(body);
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email.toLowerCase() },
        });
        if (existingUser) {
            throw new HttpError(400, 'An account with this email already exists.');
        }
        const count = await prisma.guardianProfile.count();
        const guardianCode = `GRD-${3100 + count + 1}`;
        const passwordHash = await hashPassword(data.password);
        // Resolve studentIds (either db ID or studentCode)
        const students = data.studentIds.length > 0
            ? await prisma.student.findMany({
                where: {
                    OR: [{ id: { in: data.studentIds } }, { studentCode: { in: data.studentIds } }],
                },
            })
            : [];
        const createdUser = await prisma.user.create({
            data: {
                email: data.email.toLowerCase(),
                passwordHash,
                name: data.name,
                initials: initialsFromName(data.name),
                role: 'GUARDIAN',
                status: 'ACTIVE',
                phone: data.phone || '+1 (555) 300-9999',
                guardianProfile: {
                    create: {
                        guardianCode,
                        occupation: data.occupation || 'Parent',
                        address: data.address || 'Springfield, IL',
                        students: {
                            create: students.map((st) => ({
                                studentId: st.id,
                                relationship: 'Parent',
                                isPrimary: true,
                            })),
                        },
                    },
                },
            },
            include: {
                guardianProfile: {
                    include: {
                        students: { include: { student: { include: { schoolClass: true, section: true } } } },
                    },
                },
            },
        });
        const g = createdUser.guardianProfile;
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'GUARDIAN_CREATED',
            entityType: 'Guardian',
            entityId: g.guardianCode,
            afterSummary: `Created guardian ${createdUser.name} (${createdUser.email}) linked to ${students.length} student(s)`,
        });
        return NextResponse.json({
            guardian: {
                id: g.guardianCode,
                dbId: g.id,
                userId: createdUser.id,
                name: createdUser.name,
                email: createdUser.email,
                initials: createdUser.initials,
                phone: createdUser.phone,
                occupation: g.occupation,
                status: 'Active',
                childrenCount: g.students.length,
                children: g.students.map((s) => ({
                    id: s.student.studentCode,
                    dbId: s.student.id,
                    name: s.student.name,
                    grade: `${s.student.schoolClass.name} · ${s.student.section.name}`,
                })),
            },
        }, { status: 201 });
    }
    catch (error) {
        return handleApiError(error);
    }
}
const updateGuardianSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(2).optional(),
    phone: z.string().trim().optional(),
    occupation: z.string().trim().optional(),
    address: z.string().trim().optional(),
    studentIds: z.array(z.string()).optional(),
});
export async function PATCH(request) {
    try {
        const session = await requireSession(request, ['admin']);
        const body = await request.json();
        const data = updateGuardianSchema.parse(body);
        const existing = await prisma.guardianProfile.findFirst({
            where: { OR: [{ id: data.id }, { guardianCode: data.id }] },
            include: { user: true },
        });
        if (!existing) {
            throw new HttpError(404, 'Guardian record not found.');
        }
        const updated = await prisma.guardianProfile.update({
            where: { id: existing.id },
            data: {
                ...(data.occupation ? { occupation: data.occupation } : {}),
                ...(data.address ? { address: data.address } : {}),
                user: {
                    update: {
                        ...(data.name ? { name: data.name } : {}),
                        ...(data.phone ? { phone: data.phone } : {}),
                    },
                },
            },
            include: { user: true },
        });
        if (data.studentIds) {
            const students = await prisma.student.findMany({
                where: { OR: [{ id: { in: data.studentIds } }, { studentCode: { in: data.studentIds } }] },
            });
            for (const st of students) {
                await prisma.studentGuardian.upsert({
                    where: {
                        studentId_guardianId: {
                            studentId: st.id,
                            guardianId: existing.id,
                        },
                    },
                    update: {},
                    create: {
                        studentId: st.id,
                        guardianId: existing.id,
                        relationship: 'Parent',
                        isPrimary: true,
                    },
                });
            }
        }
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'GUARDIAN_UPDATED',
            entityType: 'Guardian',
            entityId: updated.guardianCode,
            beforeSummary: existing.user.name,
            afterSummary: updated.user.name,
        });
        return NextResponse.json({
            guardian: {
                id: updated.guardianCode,
                dbId: updated.id,
                name: updated.user.name,
                email: updated.user.email,
                phone: updated.user.phone,
                occupation: updated.occupation,
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
            throw new HttpError(400, 'Guardian ID is required.');
        const existing = await prisma.guardianProfile.findFirst({
            where: { OR: [{ id }, { guardianCode: id }] },
            include: { user: true },
        });
        if (!existing) {
            throw new HttpError(404, 'Guardian record not found.');
        }
        await prisma.user.delete({ where: { id: existing.userId } });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'GUARDIAN_DELETED',
            entityType: 'Guardian',
            entityId: existing.guardianCode,
            beforeSummary: `${existing.user.name} (${existing.user.email})`,
            afterSummary: 'Deleted',
        });
        return NextResponse.json({ ok: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
