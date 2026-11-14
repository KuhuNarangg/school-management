import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { getTeacherScope, handleApiError, HttpError, requireSession } from '@/lib/server/rbac'
import { logAudit } from '@/lib/server/audit'

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
