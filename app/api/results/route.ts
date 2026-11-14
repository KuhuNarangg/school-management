import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import {
  assertGuardianStudentScope,
  assertTeacherStudentScope,
  getGuardianScope,
  getTeacherScope,
  handleApiError,
  requireSession,
} from '@/lib/server/rbac'
import { evaluateGradeFromBands, getGradeBands } from '@/lib/server/grading'

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher', 'guardian'])
    const url = new URL(request.url)
    const studentId = url.searchParams.get('studentId') || ''
    const examId = url.searchParams.get('examId') || ''

    const bands = await getGradeBands()

    const studentWhere: Record<string, unknown> = {}
    if (session.role === 'guardian') {
      const scope = await getGuardianScope(session.userId)
      if (studentId) {
        await assertGuardianStudentScope(session.userId, studentId)
      }
      studentWhere.id = { in: scope.studentIds }
      if (studentId) {
        studentWhere.OR = [{ id: studentId }, { studentCode: studentId }]
      }
    } else if (session.role === 'teacher') {
      const scope = await getTeacherScope(session.userId)
      if (studentId) {
        await assertTeacherStudentScope(session.userId, studentId)
      }
      studentWhere.sectionId = { in: scope.sectionIds }
      if (studentId) {
        studentWhere.OR = [{ id: studentId }, { studentCode: studentId }]
      }
    } else if (studentId) {
      studentWhere.OR = [{ id: studentId }, { studentCode: studentId }]
    }

    // Crucial Rule: Guardians ONLY see PUBLISHED results!
    const markWhere: Record<string, unknown> = {}
    if (session.role === 'guardian') {
      markWhere.status = 'PUBLISHED'
      markWhere.examSubject = {
        exam: { status: 'PUBLISHED' },
        ...(examId ? { examId } : {}),
      }
    } else if (examId) {
      markWhere.examSubject = { examId }
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        schoolClass: true,
        section: true,
        attendance: { select: { status: true } },
        marks: {
          where: markWhere,
          include: {
            examSubject: {
              include: {
                exam: true,
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const results = students.map((st) => {
      const totalAtt = st.attendance.length
      const presentAtt = st.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length
      const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100

      const subjectBreakdown = st.marks.map((m) => {
        const pct = (m.marksObtained / m.examSubject.maxMarks) * 100
        const evalBand = evaluateGradeFromBands(pct, bands)
        const passedPaper = m.marksObtained >= m.examSubject.passingMarks && evalBand.isPassing
        return {
          markId: m.id,
          examId: m.examSubject.examId,
          examName: m.examSubject.exam.name,
          examStatus: m.examSubject.exam.status,
          subjectId: m.examSubject.subjectId,
          subjectCode: m.examSubject.subject.code,
          subjectName: m.examSubject.subject.name,
          marksObtained: m.marksObtained,
          maxMarks: m.examSubject.maxMarks,
          passingMarks: m.examSubject.passingMarks,
          percentage: Math.round(pct * 10) / 10,
          grade: evalBand.grade,
          gpaPoints: evalBand.gpaPoints,
          passed: passedPaper,
          status: m.status,
          remarks: m.remarks,
        }
      })

      const totalObtained = subjectBreakdown.reduce((sum, s) => sum + s.marksObtained, 0)
      const totalMax = subjectBreakdown.reduce((sum, s) => sum + s.maxMarks, 0)
      const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0
      const overallEval = totalMax > 0 ? evaluateGradeFromBands(overallPercentage, bands) : null
      const allPapersPassed =
        subjectBreakdown.length > 0 && subjectBreakdown.every((s) => s.passed) && (overallEval?.isPassing ?? false)

      return {
        studentId: st.studentCode,
        studentDbId: st.id,
        name: st.name,
        email: st.email,
        initials: st.initials,
        grade: `${st.schoolClass.name} · ${st.section.name}`,
        program: st.program,
        attendance: `${attendancePct}%`,
        status: st.status === 'REVIEW' ? ('Review' as const) : ('Active' as const),
        totalObtained,
        totalMax,
        overallPercentage,
        overallGrade: overallEval?.grade || '—',
        passFail: subjectBreakdown.length === 0 ? 'PENDING' : allPapersPassed ? 'PASS' : 'FAIL',
        subjects: subjectBreakdown,
      }
    })

    return NextResponse.json({
      results,
      gradeBands: bands,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
