import { NextResponse } from '../../utils/http'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { getTeacherScope, handleApiError, HttpError, requireSession } from '../../utils/rbac'
import { logAudit } from '../../utils/audit'

const createClassOrSectionSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required.'),
  gradeLevel: z.coerce.number().int().min(1).max(12).default(10),
  sectionName: z.string().trim().min(1).default('A'),
  room: z.string().trim().min(1).default('Room 101'),
  capacity: z.coerce.number().int().min(1).max(100).default(35),
})

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher'])

    if (session.role === 'teacher') {
      const scope = await getTeacherScope(session.userId)
      const sections = await prisma.section.findMany({
        where: { id: { in: scope.sectionIds } },
        include: {
          schoolClass: true,
          _count: { select: { students: true } },
          assignments: {
            where: { teacherId: scope.teacherProfileId || '' },
            include: { subject: true },
          },
        },
        orderBy: [{ schoolClass: { gradeLevel: 'asc' } }, { name: 'asc' }],
      })

      const classes = await prisma.schoolClass.findMany({
        where: { id: { in: scope.classIds } },
        include: {
          sections: {
            where: { id: { in: scope.sectionIds } },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { gradeLevel: 'asc' },
      })

      return NextResponse.json({
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          gradeLevel: c.gradeLevel,
          academicYear: c.academicYear,
          sections: c.sections,
        })),
        sections: sections.map((sec) => ({
          id: sec.id,
          name: sec.name,
          label: `${sec.schoolClass.name} · Section ${sec.name}`,
          classId: sec.classId,
          className: sec.schoolClass.name,
          room: sec.room,
          capacity: sec.capacity,
          studentCount: sec._count.students,
          subjects: sec.assignments.map((a) => a.subject.name),
        })),
      })
    }

    // Admin sees all classes and sections
    const classes = await prisma.schoolClass.findMany({
      include: {
        sections: {
          include: {
            _count: { select: { students: true } },
            assignments: {
              include: {
                teacher: { include: { user: { select: { name: true } } } },
                subject: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        classSubjects: { include: { subject: true } },
      },
      orderBy: { gradeLevel: 'asc' },
    })

    const flatSections = classes.flatMap((c) =>
      c.sections.map((sec) => ({
        id: sec.id,
        name: sec.name,
        label: `${c.name} · Section ${sec.name}`,
        classId: c.id,
        className: c.name,
        gradeLevel: c.gradeLevel,
        room: sec.room,
        capacity: sec.capacity,
        studentCount: sec._count.students,
        subjects: sec.assignments.map((a) => `${a.subject.name} (${a.teacher.user.name})`),
      })),
    )

    return NextResponse.json({
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.gradeLevel,
        academicYear: c.academicYear,
        sections: c.sections.map((s) => ({
          id: s.id,
          name: s.name,
          room: s.room,
          capacity: s.capacity,
          studentCount: s._count.students,
        })),
        subjects: c.classSubjects.map((cs) => ({
          id: cs.subject.id,
          code: cs.subject.code,
          name: cs.subject.name,
        })),
      })),
      sections: flatSections,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const body = await request.json()
    const data = createClassOrSectionSchema.parse(body)

    let schoolClass = await prisma.schoolClass.findUnique({
      where: { name: data.name },
    })

    if (!schoolClass) {
      schoolClass = await prisma.schoolClass.create({
        data: {
          name: data.name,
          gradeLevel: data.gradeLevel,
          academicYear: '2026-2027',
        },
      })
    }

    const existingSection = await prisma.section.findUnique({
      where: {
        classId_name: {
          classId: schoolClass.id,
          name: data.sectionName,
        },
      },
    })
    if (existingSection) {
      throw new HttpError(400, `${schoolClass.name} · Section ${data.sectionName} already exists.`)
    }

    const section = await prisma.section.create({
      data: {
        classId: schoolClass.id,
        name: data.sectionName,
        room: data.room,
        capacity: data.capacity,
      },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'CLASS_SECTION_CREATED',
      entityType: 'Section',
      entityId: section.id,
      afterSummary: `Created ${schoolClass.name} · Section ${section.name} (${section.room})`,
    })

    return NextResponse.json(
      {
        schoolClass,
        section: {
          id: section.id,
          name: section.name,
          label: `${schoolClass.name} · Section ${section.name}`,
          classId: schoolClass.id,
          className: schoolClass.name,
          room: section.room,
          capacity: section.capacity,
          studentCount: 0,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return handleApiError(error)
  }
}

const updateSectionSchema = z.object({
  sectionId: z.string().min(1),
  room: z.string().trim().min(1).optional(),
  capacity: z.coerce.number().int().min(1).max(100).optional(),
})

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const body = await request.json()
    const data = updateSectionSchema.parse(body)

    const existing = await prisma.section.findUnique({
      where: { id: data.sectionId },
      include: { schoolClass: true },
    })
    if (!existing) {
      throw new HttpError(404, 'Section not found.')
    }

    const updated = await prisma.section.update({
      where: { id: existing.id },
      data: {
        ...(data.room ? { room: data.room } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      },
      include: { schoolClass: true },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'SECTION_UPDATED',
      entityType: 'Section',
      entityId: updated.id,
      beforeSummary: `${existing.schoolClass.name}·${existing.name} (${existing.room}, cap ${existing.capacity})`,
      afterSummary: `${updated.schoolClass.name}·${updated.name} (${updated.room}, cap ${updated.capacity})`,
    })

    return NextResponse.json({
      section: {
        id: updated.id,
        name: updated.name,
        label: `${updated.schoolClass.name} · Section ${updated.name}`,
        room: updated.room,
        capacity: updated.capacity,
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
    const sectionId = url.searchParams.get('sectionId') || url.searchParams.get('id') || ''
    if (!sectionId) throw new HttpError(400, 'Section ID is required.')

    const existing = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { schoolClass: true, _count: { select: { students: true } } },
    })
    if (!existing) {
      throw new HttpError(404, 'Section not found.')
    }

    if (existing._count.students > 0) {
      throw new HttpError(
        409,
        `Cannot delete ${existing.schoolClass.name} · Section ${existing.name} because ${existing._count.students} student(s) are currently enrolled in it.`,
      )
    }

    await prisma.section.delete({ where: { id: existing.id } })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'SECTION_DELETED',
      entityType: 'Section',
      entityId: existing.id,
      beforeSummary: `${existing.schoolClass.name} · Section ${existing.name}`,
      afterSummary: 'Deleted',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
