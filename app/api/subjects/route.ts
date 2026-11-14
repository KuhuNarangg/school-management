import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { getTeacherScope, handleApiError, HttpError, requireSession } from '@/lib/server/rbac'
import { logAudit } from '@/lib/server/audit'

const createSubjectSchema = z.object({
  code: z.string().trim().min(2, 'Subject code is required.'),
  name: z.string().trim().min(2, 'Subject name is required.'),
  department: z.string().trim().min(2).default('Science'),
  maxMarksDefault: z.coerce.number().int().min(10).max(500).default(100),
  passingMarksDefault: z.coerce.number().int().min(1).max(500).default(40),
  classIds: z.array(z.string()).optional().default([]),
})

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher'])

    let where: Record<string, unknown> = {}
    if (session.role === 'teacher') {
      const scope = await getTeacherScope(session.userId)
      where = { id: { in: scope.subjectIds } }
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        classSubjects: { include: { schoolClass: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      subjects: subjects.map((s) => ({
        id: s.code,
        dbId: s.id,
        code: s.code,
        name: s.name,
        department: s.department,
        maxMarksDefault: s.maxMarksDefault,
        passingMarksDefault: s.passingMarksDefault,
        classes: s.classSubjects.map((cs) => cs.schoolClass.name),
        assignmentCount: s._count.assignments,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const body = await request.json()
    const data = createSubjectSchema.parse(body)

    const existing = await prisma.subject.findFirst({
      where: {
        OR: [
          { code: { equals: data.code.toUpperCase(), mode: 'insensitive' } },
          { name: { equals: data.name, mode: 'insensitive' } },
        ],
      },
    })
    if (existing) {
      throw new HttpError(400, 'A subject with that code or name already exists.')
    }

    let classIds = data.classIds
    if (classIds.length === 0) {
      const allClasses = await prisma.schoolClass.findMany({ select: { id: true } })
      classIds = allClasses.map((c) => c.id)
    }

    const subject = await prisma.subject.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        department: data.department,
        maxMarksDefault: data.maxMarksDefault,
        passingMarksDefault: data.passingMarksDefault,
        classSubjects: {
          create: classIds.map((classId) => ({ classId })),
        },
      },
      include: {
        classSubjects: { include: { schoolClass: true } },
      },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'SUBJECT_CREATED',
      entityType: 'Subject',
      entityId: subject.code,
      afterSummary: `Created subject ${subject.name} (${subject.code}) in ${subject.department}`,
    })

    return NextResponse.json(
      {
        subject: {
          id: subject.code,
          dbId: subject.id,
          code: subject.code,
          name: subject.name,
          department: subject.department,
          maxMarksDefault: subject.maxMarksDefault,
          passingMarksDefault: subject.passingMarksDefault,
          classes: subject.classSubjects.map((cs) => cs.schoolClass.name),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return handleApiError(error)
  }
}
