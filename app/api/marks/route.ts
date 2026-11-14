import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { getTeacherScope, handleApiError, HttpError, requireSession } from '@/lib/server/rbac'
import { evaluateGradeFromBands, getGradeBands } from '@/lib/server/grading'
import { logAudit } from '@/lib/server/audit'

const markItemSchema = z.object({
  studentId: z.string().min(1),
  marksObtained: z.number().int(),
  remarks: z.string().optional(),
})

const saveMarksSchema = z.object({
  examId: z.string().optional(),
  examSubjectId: z.string().optional(),
  sectionId: z.string().optional(),
  subjectId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']).optional().default('DRAFT'),
  entries: z.array(markItemSchema).min(1, 'Provide at least one mark entry.'),
})

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher'])
    const url = new URL(request.url)
    const examIdParam = url.searchParams.get('examId') || ''
    const sectionIdParam = url.searchParams.get('sectionId') || ''
    const subjectIdParam = url.searchParams.get('subjectId') || ''

    const bands = await getGradeBands()
    const scope = session.role === 'teacher' ? await getTeacherScope(session.userId) : null

    if (session.role === 'teacher') {
      if (sectionIdParam && !scope?.sectionIds.includes(sectionIdParam)) {
        throw new HttpError(404, 'Section not found.')
      }
      if (subjectIdParam && !scope?.subjectIds.includes(subjectIdParam)) {
        throw new HttpError(404, 'Subject not found.')
      }
    }

    // Pick exam (prefer DRAFT or SUBMITTED for marks entry if none specified)
    const exams = await prisma.exam.findMany({
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    })
    const activeExam =
      (examIdParam ? exams.find((e) => e.id === examIdParam) : null) ||
      exams.find((e) => e.status !== 'PUBLISHED') ||
      exams[0]

    if (!activeExam) {
      return NextResponse.json({ exams: [], activeExam: null, roster: [] })
    }

    const activeSectionId =
      sectionIdParam ||
      (session.role === 'teacher' ? scope?.sectionIds[0] : undefined) ||
      (await prisma.section.findFirst({ orderBy: { name: 'asc' } }))?.id ||
      ''

    const section = activeSectionId
      ? await prisma.section.findUnique({
          where: { id: activeSectionId },
          include: { schoolClass: true },
        })
      : null

    if (!section) {
      throw new HttpError(404, 'Section not found.')
    }

    const activeSubjectId =
      subjectIdParam ||
      (session.role === 'teacher' ? scope?.subjectIds[0] : undefined) ||
      (await prisma.subject.findFirst({ orderBy: { name: 'asc' } }))?.id ||
      ''

    const examSubject = await prisma.examSubject.findFirst({
      where: {
        examId: activeExam.id,
        classId: section.classId,
        ...(activeSubjectId ? { subjectId: activeSubjectId } : {}),
      },
      include: { subject: true },
    })

    const students = await prisma.student.findMany({
      where: { sectionId: section.id },
      include: {
        marks: examSubject
          ? {
              where: { examSubjectId: examSubject.id },
            }
          : false,
      },
      orderBy: { name: 'asc' },
    })

    const roster = students.map((st) => {
      const entry = Array.isArray(st.marks) ? st.marks[0] : undefined
      const maxMarks = examSubject?.maxMarks ?? 100
      const pct = entry ? (entry.marksObtained / maxMarks) * 100 : null
      const gradeEval = pct !== null ? evaluateGradeFromBands(pct, bands) : null
      return {
        studentId: st.studentCode,
        studentDbId: st.id,
        name: st.name,
        initials: st.initials,
        marksObtained: entry ? entry.marksObtained : null,
        maxMarks,
        passingMarks: examSubject?.passingMarks ?? 40,
        status: entry ? entry.status : 'NOT_ENTERED',
        grade: gradeEval?.grade || '—',
        isPassing: gradeEval?.isPassing ?? null,
      }
    })

    return NextResponse.json({
      exams: exams.map((e) => ({ id: e.id, name: e.name, status: e.status, locked: e.locked })),
      activeExam: {
        id: activeExam.id,
        name: activeExam.name,
        status: activeExam.status,
        locked: activeExam.locked,
      },
      section: {
        id: section.id,
        label: `${section.schoolClass.name} · Section ${section.name}`,
      },
      examSubject: examSubject
        ? {
            id: examSubject.id,
            subjectId: examSubject.subjectId,
            subjectName: examSubject.subject.name,
            maxMarks: examSubject.maxMarks,
            passingMarks: examSubject.passingMarks,
          }
        : null,
      roster,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher'])
    const body = await request.json()
    const data = saveMarksSchema.parse(body)

    const scope = session.role === 'teacher' ? await getTeacherScope(session.userId) : null

    // Resolve ExamSubject
    let examSubject = data.examSubjectId
      ? await prisma.examSubject.findUnique({
          where: { id: data.examSubjectId },
          include: { exam: true, subject: true, schoolClass: true },
        })
      : null

    if (!examSubject) {
      // Find first student to determine class
      const firstStudent = await prisma.student.findFirst({
        where: {
          OR: [{ id: data.entries[0].studentId }, { studentCode: data.entries[0].studentId }],
        },
      })
      if (!firstStudent) {
        throw new HttpError(404, 'Student not found.')
      }

      const targetExam = data.examId
        ? await prisma.exam.findUnique({ where: { id: data.examId } })
        : await prisma.exam.findFirst({
            where: { status: { in: ['DRAFT', 'SUBMITTED'] } },
            orderBy: { startDate: 'desc' },
          })

      if (!targetExam) {
        throw new HttpError(400, 'No open examination found for marks entry.')
      }

      const targetSubjectId =
        data.subjectId ||
        (session.role === 'teacher' ? scope?.subjectIds[0] : undefined) ||
        (await prisma.subject.findFirst())?.id

      if (!targetSubjectId) {
        throw new HttpError(400, 'Subject is required.')
      }

      examSubject = await prisma.examSubject.findUnique({
        where: {
          examId_classId_subjectId: {
            examId: targetExam.id,
            classId: firstStudent.classId,
            subjectId: targetSubjectId,
          },
        },
        include: { exam: true, subject: true, schoolClass: true },
      })
    }

    if (!examSubject) {
      throw new HttpError(404, 'Exam subject paper not found.')
    }

    // Check lock status
    if (examSubject.exam.locked || examSubject.exam.status === 'PUBLISHED') {
      throw new HttpError(
        403,
        'This examination is published and locked. An administrator must unlock it with a reason before marks can be modified.',
      )
    }

    if (session.role === 'teacher') {
      if (
        !scope?.classIds.includes(examSubject.classId) ||
        !scope?.subjectIds.includes(examSubject.subjectId)
      ) {
        throw new HttpError(404, 'You are not assigned to this class and subject.')
      }
    }

    // Validate marks against [0, maxMarks]
    for (const item of data.entries) {
      if (item.marksObtained < 0) {
        throw new HttpError(400, 'Marks cannot be negative.')
      }
      if (item.marksObtained > examSubject.maxMarks) {
        throw new HttpError(
          400,
          `Marks (${item.marksObtained}) cannot exceed maximum marks (${examSubject.maxMarks}).`,
        )
      }
    }

    const studentCodesOrIds = data.entries.map((e) => e.studentId)
    const students = await prisma.student.findMany({
      where: {
        OR: [{ id: { in: studentCodesOrIds } }, { studentCode: { in: studentCodesOrIds } }],
      },
    })
    const studentMap = new Map<string, (typeof students)[number]>()
    for (const st of students) {
      studentMap.set(st.id, st)
      studentMap.set(st.studentCode, st)
    }

    for (const item of data.entries) {
      const st = studentMap.get(item.studentId)
      if (!st) {
        throw new HttpError(404, `Student ${item.studentId} not found.`)
      }
      if (session.role === 'teacher' && !scope?.sectionIds.includes(st.sectionId)) {
        throw new HttpError(404, 'Student is not in your assigned sections.')
      }
    }

    const saved = []
    for (const item of data.entries) {
      const st = studentMap.get(item.studentId)!
      const existingMark = await prisma.markEntry.findUnique({
        where: {
          examSubjectId_studentId: {
            examSubjectId: examSubject.id,
            studentId: st.id,
          },
        },
      })

      if (existingMark?.status === 'PUBLISHED') {
        throw new HttpError(403, 'Published marks are locked and cannot be modified.')
      }

      const upserted = await prisma.markEntry.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: examSubject.id,
            studentId: st.id,
          },
        },
        update: {
          marksObtained: item.marksObtained,
          status: data.status,
          enteredById: session.userId,
          remarks: item.remarks ?? existingMark?.remarks ?? null,
        },
        create: {
          examSubjectId: examSubject.id,
          studentId: st.id,
          marksObtained: item.marksObtained,
          status: data.status,
          enteredById: session.userId,
          remarks: item.remarks ?? null,
        },
      })
      saved.push(upserted)
    }

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role.toUpperCase(),
      action: 'MARKS_ENTERED',
      entityType: 'ExamSubject',
      entityId: examSubject.id,
      afterSummary: `Entered ${saved.length} mark(s) for ${examSubject.exam.name} · ${examSubject.subject.name} (${data.status})`,
    })

    return NextResponse.json({
      savedCount: saved.length,
      status: data.status,
      examSubjectId: examSubject.id,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
