import { NextResponse } from '../../utils/http'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { getTeacherScope, handleApiError, HttpError, requireSession } from '../../utils/rbac'
import { logAudit } from '../../utils/audit'

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

    if (data.passingMarksDefault > data.maxMarksDefault) {
      throw new HttpError(400, 'Passing marks cannot exceed maximum marks.')
    }

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

const updateSubjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).optional(),
  department: z.string().trim().min(2).optional(),
  maxMarksDefault: z.coerce.number().int().min(10).max(500).optional(),
  passingMarksDefault: z.coerce.number().int().min(1).max(500).optional(),
})

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const body = await request.json()
    const data = updateSubjectSchema.parse(body)

    const existing = await prisma.subject.findFirst({
      where: { OR: [{ id: data.id }, { code: data.id.toUpperCase() }] },
    })
    if (!existing) {
      throw new HttpError(404, 'Subject not found.')
    }

    const nextMax = data.maxMarksDefault ?? existing.maxMarksDefault
    const nextPass = data.passingMarksDefault ?? existing.passingMarksDefault
    if (nextPass > nextMax) {
      throw new HttpError(400, 'Passing marks cannot exceed maximum marks.')
    }

    const updated = await prisma.subject.update({
      where: { id: existing.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.department ? { department: data.department } : {}),
        maxMarksDefault: nextMax,
        passingMarksDefault: nextPass,
      },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'SUBJECT_UPDATED',
      entityType: 'Subject',
      entityId: updated.code,
      beforeSummary: `${existing.name} (${existing.maxMarksDefault}/${existing.passingMarksDefault})`,
      afterSummary: `${updated.name} (${updated.maxMarksDefault}/${updated.passingMarksDefault})`,
    })

    return NextResponse.json({
      subject: {
        id: updated.code,
        dbId: updated.id,
        code: updated.code,
        name: updated.name,
        department: updated.department,
        maxMarksDefault: updated.maxMarksDefault,
        passingMarksDefault: updated.passingMarksDefault,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const url = new URL(request.url)
    const id = url.searchParams.get('id') || ''
    if (!id) throw new HttpError(400, 'Subject ID or code is required.')

    const existing = await prisma.subject.findFirst({
      where: { OR: [{ id }, { code: id.toUpperCase() }] },
    })
    if (!existing) {
      throw new HttpError(404, 'Subject not found.')
    }

    const marksCount = await prisma.markEntry.count({
      where: { examSubject: { subjectId: existing.id } },
    })
    if (marksCount > 0) {
      throw new HttpError(
        409,
        `Cannot delete subject ${existing.name} (${existing.code}) because ${marksCount} examination mark entries depend on it.`,
      )
    }

    await prisma.subject.delete({ where: { id: existing.id } })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'SUBJECT_DELETED',
      entityType: 'Subject',
      entityId: existing.code,
      beforeSummary: `${existing.name} (${existing.code})`,
      afterSummary: 'Deleted',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
