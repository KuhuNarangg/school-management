import { NextResponse } from 'next/server'
import { getRequestSession, type SessionPayload } from './auth'
import { prisma } from './prisma'
import type { SchoolRole } from '@/lib/types'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Verifies CSRF protection on state-changing requests (POST, PUT, PATCH, DELETE).
 * Checks Same-Origin / Referer or matching `x-csrf-token` header.
 */
export function verifyCsrf(request: Request, session: SessionPayload): void {
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return

  const headerToken = request.headers.get('x-csrf-token')
  if (headerToken && headerToken === session.csrfToken) return

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (origin && host) {
    try {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        throw new HttpError(403, 'CSRF origin mismatch.')
      }
      return
    } catch (err) {
      if (err instanceof HttpError) throw err
      throw new HttpError(403, 'Invalid request origin.')
    }
  }

  // If explicit wrong x-csrf-token was provided, reject immediately
  if (headerToken !== null && headerToken !== session.csrfToken) {
    throw new HttpError(403, 'Invalid CSRF token.')
  }
}

export async function requireSession(
  request: Request,
  allowedRoles?: SchoolRole[],
): Promise<SessionPayload> {
  const session = await getRequestSession(request)
  if (!session) {
    throw new HttpError(401, 'Authentication required. Please sign in.')
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new HttpError(403, 'Access denied for your account role.')
  }
  verifyCsrf(request, session)
  return session
}

/**
 * Returns the teacher's profile ID and assigned section IDs, class IDs, and subject IDs.
 */
export async function getTeacherScope(userId: string) {
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      assignments: true,
    },
  })
  if (!profile) {
    return {
      teacherProfileId: null,
      sectionIds: [] as string[],
      classIds: [] as string[],
      subjectIds: [] as string[],
      assignments: [],
    }
  }
  const sectionIds = Array.from(new Set(profile.assignments.map((a) => a.sectionId)))
  const classIds = Array.from(new Set(profile.assignments.map((a) => a.classId)))
  const subjectIds = Array.from(new Set(profile.assignments.map((a) => a.subjectId)))
  return {
    teacherProfileId: profile.id,
    sectionIds,
    classIds,
    subjectIds,
    assignments: profile.assignments,
  }
}

/**
 * Returns the guardian's profile ID and linked student IDs.
 */
export async function getGuardianScope(userId: string) {
  const profile = await prisma.guardianProfile.findUnique({
    where: { userId },
    include: {
      students: true,
    },
  })
  if (!profile) {
    return {
      guardianProfileId: null,
      studentIds: [] as string[],
    }
  }
  return {
    guardianProfileId: profile.id,
    studentIds: profile.students.map((s) => s.studentId),
  }
}

/**
 * Asserts that a teacher is assigned to a specific section; throws 404 if out of scope.
 */
export async function assertTeacherSectionScope(userId: string, sectionId: string) {
  const scope = await getTeacherScope(userId)
  if (!scope.sectionIds.includes(sectionId)) {
    throw new HttpError(404, 'Section not found.')
  }
  return scope
}

/**
 * Asserts that a teacher is assigned to a student's section; throws 404 if out of scope.
 */
export async function assertTeacherStudentScope(userId: string, studentId: string) {
  const scope = await getTeacherScope(userId)
  const student = await prisma.student.findFirst({
    where: {
      OR: [{ id: studentId }, { studentCode: studentId }],
    },
  })
  if (!student || !scope.sectionIds.includes(student.sectionId)) {
    throw new HttpError(404, 'Student record not found.')
  }
  return student
}

/**
 * Asserts that a guardian is linked to a specific student; throws 404 if out of scope.
 */
export async function assertGuardianStudentScope(userId: string, studentId: string) {
  const scope = await getGuardianScope(userId)
  const student = await prisma.student.findFirst({
    where: {
      OR: [{ id: studentId }, { studentCode: studentId }],
    },
  })
  if (!student || !scope.studentIds.includes(student.id)) {
    throw new HttpError(404, 'Student record not found.')
  }
  return student
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues: Array<{ message: string }> }).issues
    return NextResponse.json(
      { error: issues[0]?.message || 'Validation failed.', issues },
      { status: 400 },
    )
  }
  console.error('API Error:', error)
  return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
}
