import { NextResponse } from './http';
import { getRequestSession } from './auth';
import { prisma } from './prisma';
export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
/**
 * Verifies CSRF protection on state-changing requests (POST, PUT, PATCH, DELETE).
 * Checks Same-Origin / Referer or matching `x-csrf-token` header.
 */
export function verifyCsrf(request, session) {
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method))
        return;
    const headerToken = request.headers.get('x-csrf-token');
    if (headerToken && headerToken === session.csrfToken)
        return;
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
        try {
            const originHost = new URL(origin).host;
            if (originHost !== host) {
                throw new HttpError(403, 'CSRF origin mismatch.');
            }
            return;
        }
        catch (err) {
            if (err instanceof HttpError)
                throw err;
            throw new HttpError(403, 'Invalid request origin.');
        }
    }
    // If explicit wrong x-csrf-token was provided, reject immediately
    if (headerToken !== null && headerToken !== session.csrfToken) {
        throw new HttpError(403, 'Invalid CSRF token.');
    }
}
export async function requireSession(request, allowedRoles) {
    const session = await getRequestSession(request);
    if (!session) {
        throw new HttpError(401, 'Authentication required. Please sign in.');
    }
    if (allowedRoles && !allowedRoles.includes(session.role)) {
        throw new HttpError(403, 'Access denied for your account role.');
    }
    verifyCsrf(request, session);
    return session;
}
/**
 * Returns the teacher's profile ID and assigned section IDs, class IDs, and subject IDs.
 */
export async function getTeacherScope(userId) {
    const profile = await prisma.teacherProfile.findUnique({
        where: { userId },
        include: {
            assignments: true,
        },
    });
    if (!profile) {
        return {
            teacherProfileId: null,
            sectionIds: [],
            classIds: [],
            subjectIds: [],
            assignments: [],
        };
    }
    const sectionIds = Array.from(new Set(profile.assignments.map((a) => a.sectionId)));
    const classIds = Array.from(new Set(profile.assignments.map((a) => a.classId)));
    const subjectIds = Array.from(new Set(profile.assignments.map((a) => a.subjectId)));
    return {
        teacherProfileId: profile.id,
        sectionIds,
        classIds,
        subjectIds,
        assignments: profile.assignments,
    };
}
/**
 * Returns the guardian's profile ID and linked student IDs.
 */
export async function getGuardianScope(userId) {
    const profile = await prisma.guardianProfile.findUnique({
        where: { userId },
        include: {
            students: true,
        },
    });
    if (!profile) {
        return {
            guardianProfileId: null,
            studentIds: [],
        };
    }
    return {
        guardianProfileId: profile.id,
        studentIds: profile.students.map((s) => s.studentId),
    };
}
/**
 * Asserts that a teacher is assigned to a specific section; throws 404 if out of scope.
 */
export async function assertTeacherSectionScope(userId, sectionId) {
    const scope = await getTeacherScope(userId);
    if (!scope.sectionIds.includes(sectionId)) {
        throw new HttpError(404, 'Section not found.');
    }
    return scope;
}
/**
 * Asserts that a teacher is assigned to a student's section; throws 404 if out of scope.
 */
export async function assertTeacherStudentScope(userId, studentId) {
    const scope = await getTeacherScope(userId);
    const student = await prisma.student.findFirst({
        where: {
            OR: [{ id: studentId }, { studentCode: studentId }],
        },
    });
    if (!student || !scope.sectionIds.includes(student.sectionId)) {
        throw new HttpError(404, 'Student record not found.');
    }
    return student;
}
/**
 * Asserts that a guardian is linked to a specific student; throws 404 if out of scope.
 */
export async function assertGuardianStudentScope(userId, studentId) {
    const scope = await getGuardianScope(userId);
    const student = await prisma.student.findFirst({
        where: {
            OR: [{ id: studentId }, { studentCode: studentId }],
        },
    });
    if (!student || !scope.studentIds.includes(student.id)) {
        throw new HttpError(404, 'Student record not found.');
    }
    return student;
}
export function handleApiError(error) {
    if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
        const issues = error.issues;
        return NextResponse.json({ error: issues[0]?.message || 'Validation failed.', issues }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'code' in error) {
        const prismaCode = error.code;
        if (prismaCode === 'P2002') {
            const target = error.meta?.target;
            const fieldInfo = Array.isArray(target) ? ` (${target.join(', ')})` : '';
            return NextResponse.json({ error: `Duplicate record: unique constraint violated${fieldInfo}.` }, { status: 409 });
        }
        if (prismaCode === 'P2003') {
            return NextResponse.json({ error: 'Operation rejected due to related dependent records or invalid reference.' }, { status: 409 });
        }
        if (prismaCode === 'P2025') {
            return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
        }
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
}
