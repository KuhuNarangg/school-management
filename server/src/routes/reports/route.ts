import { NextResponse } from '../../utils/http'
import { prisma } from '../../utils/prisma'
import { getTeacherScope, handleApiError, requireSession } from '../../utils/rbac'
import { computeNetPaidCents, deriveInvoiceStatus, formatCentsFixed } from '../../utils/fees'
import { evaluateGradeFromBands, getGradeBands } from '../../utils/grading'

function toCsvResponse(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const allRows = [headers, ...rows]
  const csv = allRows
    .map((r) => r.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher'])
    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'student'
    const format = url.searchParams.get('format') || 'json'
    const classId = url.searchParams.get('classId') || ''
    const search = (url.searchParams.get('search') || '').trim().toLowerCase()

    // Teachers can only run academic/attendance/student reports for their assigned sections, never fee reports
    if (session.role === 'teacher' && (type === 'fee-collection' || type === 'outstanding-fees')) {
      return NextResponse.json({ error: 'Teachers cannot access fee reports.' }, { status: 403 })
    }

    const teacherScope = session.role === 'teacher' ? await getTeacherScope(session.userId) : null
    const bands = await getGradeBands()

    if (type === 'student' || type === 'attendance' || type === 'academic-performance') {
      const students = await prisma.student.findMany({
        where: {
          ...(session.role === 'teacher' ? { sectionId: { in: teacherScope?.sectionIds || [] } } : {}),
          ...(classId ? { classId } : {}),
        },
        include: {
          schoolClass: true,
          section: true,
          attendance: true,
          marks: {
            include: { examSubject: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      const rows = students
        .map((st) => {
          const totalAtt = st.attendance.length
          const present = st.attendance.filter((a) => a.status === 'PRESENT').length
          const late = st.attendance.filter((a) => a.status === 'LATE').length
          const absent = st.attendance.filter((a) => a.status === 'ABSENT').length
          const attPct = totalAtt > 0 ? Math.round(((present + late) / totalAtt) * 100) : 100

          const totalObt = st.marks.reduce((s, m) => s + m.marksObtained, 0)
          const totalMax = st.marks.reduce((s, m) => s + m.examSubject.maxMarks, 0)
          const avgScore = totalMax > 0 ? Math.round((totalObt / totalMax) * 1000) / 10 : 0
          const evalGrade = totalMax > 0 ? evaluateGradeFromBands(avgScore, bands).grade : '—'

          return {
            id: st.studentCode,
            name: st.name,
            email: st.email,
            grade: `${st.schoolClass.name} · ${st.section.name}`,
            program: st.program,
            attendance: `${attPct}%`,
            presentDays: present,
            lateDays: late,
            absentDays: absent,
            averagePercentage: `${avgScore}%`,
            overallGrade: evalGrade,
            status: st.status === 'REVIEW' ? 'Review' : 'Active',
          }
        })
        .filter((r) => !search || `${r.name} ${r.id} ${r.grade} ${r.program}`.toLowerCase().includes(search))

      if (format === 'csv') {
        return toCsvResponse(
          `${type}-report-northstar.csv`,
          ['Student ID', 'Name', 'Grade', 'Program', 'Attendance', 'Avg Score', 'Grade Band', 'Status'],
          rows.map((r) => [
            r.id,
            r.name,
            r.grade,
            r.program,
            r.attendance,
            r.averagePercentage,
            r.overallGrade,
            r.status,
          ]),
        )
      }

      return NextResponse.json({ reportType: type, rows })
    }

    if (type === 'exam') {
      const exams = await prisma.exam.findMany({
        include: {
          examSubjects: {
            include: {
              schoolClass: true,
              subject: true,
              marks: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
      })

      const rows = exams.flatMap((ex) =>
        ex.examSubjects.map((es) => {
          const count = es.marks.length
          const avg =
            count > 0
              ? Math.round((es.marks.reduce((s, m) => s + m.marksObtained, 0) / count) * 10) / 10
              : 0
          const passCount = es.marks.filter((m) => m.marksObtained >= es.passingMarks).length
          const passRate = count > 0 ? `${Math.round((passCount / count) * 100)}%` : '0%'
          return {
            id: es.id,
            examName: ex.name,
            status: ex.status,
            className: es.schoolClass.name,
            subjectName: es.subject.name,
            papersGraded: count,
            averageMarks: `${avg} / ${es.maxMarks}`,
            passRate,
          }
        }),
      )

      if (format === 'csv') {
        return toCsvResponse(
          'exam-report-northstar.csv',
          ['Exam', 'Status', 'Class', 'Subject', 'Papers Graded', 'Average Marks', 'Pass Rate'],
          rows.map((r) => [
            r.examName,
            r.status,
            r.className,
            r.subjectName,
            r.papersGraded,
            r.averageMarks,
            r.passRate,
          ]),
        )
      }

      return NextResponse.json({ reportType: type, rows })
    }

    // Fee collection & Outstanding fees reports (Admin only)
    const invoices = await prisma.feeInvoice.findMany({
      include: {
        student: { include: { schoolClass: true, section: true } },
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    const feeRows = invoices
      .map((inv) => {
        const paidCents = computeNetPaidCents(inv.payments)
        const outstandingCents = Math.max(0, inv.totalCents - paidCents)
        const derivedStatus = deriveInvoiceStatus(inv.totalCents, paidCents)
        return {
          invoiceNo: inv.invoiceNo,
          studentId: inv.student.studentCode,
          studentName: inv.student.name,
          grade: `${inv.student.schoolClass.name} · ${inv.student.section.name}`,
          title: inv.title,
          dueDate: new Date(inv.dueDate).toISOString().slice(0, 10),
          totalAmount: formatCentsFixed(inv.totalCents),
          paidAmount: formatCentsFixed(paidCents),
          outstandingAmount: formatCentsFixed(outstandingCents),
          outstandingCents,
          status: derivedStatus,
        }
      })
      .filter((r) => (type === 'outstanding-fees' ? r.outstandingCents > 0 : true))
      .filter((r) => !search || `${r.invoiceNo} ${r.studentName} ${r.grade}`.toLowerCase().includes(search))

    if (format === 'csv') {
      return toCsvResponse(
        `${type}-report-northstar.csv`,
        ['Invoice No', 'Student ID', 'Student Name', 'Grade', 'Description', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Status'],
        feeRows.map((r) => [
          r.invoiceNo,
          r.studentId,
          r.studentName,
          r.grade,
          r.title,
          r.dueDate,
          r.totalAmount,
          r.paidAmount,
          r.outstandingAmount,
          r.status,
        ]),
      )
    }

    return NextResponse.json({ reportType: type, rows: feeRows })
  } catch (error) {
    return handleApiError(error)
  }
}
