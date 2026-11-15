import { NextResponse } from '../../../utils/http'
import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import {
  assertGuardianStudentScope,
  assertTeacherStudentScope,
  handleApiError,
  HttpError,
  requireSession,
} from '../../../utils/rbac'
import { logAudit } from '../../../utils/audit'

const updateStudentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  program: z.string().trim().min(1).optional(),
  status: z.enum(['ACTIVE', 'REVIEW', 'INACTIVE']).optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  guardianId: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(request, ['admin', 'teacher', 'guardian'])
    const { id } = await params

    if (session.role === 'teacher') {
      await assertTeacherStudentScope(session.userId, id)
    } else if (session.role === 'guardian') {
      await assertGuardianStudentScope(session.userId, id)
    }

    const student = await prisma.student.findFirst({
      where: { OR: [{ id }, { studentCode: id }] },
      include: {
        schoolClass: true,
        section: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        guardians: {
          include: {
            guardian: {
              include: { user: { select: { id: true, name: true, email: true, phone: true } } },
            },
          },
        },
      },
    })

    if (!student) {
      throw new HttpError(404, 'Student record not found.')
    }

    const totalAtt = student.attendance.length
    const presentAtt = student.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length
    const pct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100

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
        attendance: `${pct}%`,
        status: student.status === 'REVIEW' ? 'Review' : 'Active',
        guardians:
          session.role === 'teacher'
            ? []
            : student.guardians.map((g) => ({
                id: g.guardian.id,
                name: g.guardian.user.name,
                email: g.guardian.user.email,
                relationship: g.relationship,
              })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(request, ['admin'])
    const { id } = await params
    const body = await request.json()
    const data = updateStudentSchema.parse(body)

    const existing = await prisma.student.findFirst({
      where: { OR: [{ id }, { studentCode: id }] },
      include: { schoolClass: true, section: true },
    })
    if (!existing) {
      throw new HttpError(404, 'Student record not found.')
    }

    const targetClassId = data.classId || existing.classId
    const targetSectionId = data.sectionId || existing.sectionId

    if (data.sectionId || data.classId) {
      const section = await prisma.section.findUnique({ where: { id: targetSectionId } })
      if (!section || section.classId !== targetClassId) {
        throw new HttpError(400, 'Section does not belong to the specified class.')
      }
    }

    const updated = await prisma.student.update({
      where: { id: existing.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
        ...(data.program ? { program: data.program } : {}),
        ...(data.status ? { status: data.status } : {}),
        classId: targetClassId,
        sectionId: targetSectionId,
      },
      include: { schoolClass: true, section: true },
    })

    if (data.guardianId) {
      await prisma.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId: existing.id,
            guardianId: data.guardianId,
          },
        },
        update: {},
        create: {
          studentId: existing.id,
          guardianId: data.guardianId,
          relationship: 'Parent',
          isPrimary: true,
        },
      })
    }

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'STUDENT_UPDATED',
      entityType: 'Student',
      entityId: updated.studentCode,
      beforeSummary: `${existing.name} (${existing.schoolClass.name}·${existing.section.name}, ${existing.status})`,
      afterSummary: `${updated.name} (${updated.schoolClass.name}·${updated.section.name}, ${updated.status})`,
    })

    return NextResponse.json({
      student: {
        id: updated.studentCode,
        dbId: updated.id,
        name: updated.name,
        email: updated.email,
        initials: updated.initials,
        grade: `${updated.schoolClass.name} · ${updated.section.name}`,
        classId: updated.classId,
        sectionId: updated.sectionId,
        program: updated.program,
        status: updated.status === 'REVIEW' ? 'Review' : 'Active',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(request, ['admin'])
    const { id } = await params
    const existing = await prisma.student.findFirst({
      where: { OR: [{ id }, { studentCode: id }] },
    })
    if (!existing) {
      throw new HttpError(404, 'Student record not found.')
    }

    await prisma.student.delete({ where: { id: existing.id } })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'STUDENT_DELETED',
      entityType: 'Student',
      entityId: existing.studentCode,
      beforeSummary: `${existing.name} (${existing.studentCode})`,
      afterSummary: 'Deleted',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
