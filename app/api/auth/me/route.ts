import { NextResponse } from 'next/server'
import { handleApiError, getGuardianScope, getTeacherScope, requireSession } from '@/lib/server/rbac'
import { prisma } from '@/lib/server/prisma'

export async function GET(request: Request) {
  try {
    const session = await requireSession(request)
    let children: Array<{
      id: string
      dbId: string
      name: string
      grade: string
      program: string
      attendance: string
      status: 'Active' | 'Review'
      initials: string
    }> = []

    let assignedStudents: typeof children = []

    if (session.role === 'guardian') {
      const scope = await getGuardianScope(session.userId)
      const rawChildren = await prisma.student.findMany({
        where: { id: { in: scope.studentIds } },
        include: {
          schoolClass: true,
          section: true,
          attendance: true,
        },
        orderBy: { name: 'asc' },
      })
      children = rawChildren.map((st) => {
        const total = st.attendance.length
        const present = st.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length
        const pct = total > 0 ? Math.round((present / total) * 100) : 100
        return {
          id: st.studentCode,
          dbId: st.id,
          name: st.name,
          grade: `${st.schoolClass.name} · ${st.section.name}`,
          program: st.program,
          attendance: `${pct}%`,
          status: st.status === 'REVIEW' ? 'Review' : 'Active',
          initials: st.initials,
        }
      })
    } else if (session.role === 'teacher') {
      const scope = await getTeacherScope(session.userId)
      const rawStudents = await prisma.student.findMany({
        where: { sectionId: { in: scope.sectionIds } },
        include: {
          schoolClass: true,
          section: true,
          attendance: true,
        },
        orderBy: { name: 'asc' },
      })
      assignedStudents = rawStudents.map((st) => {
        const total = st.attendance.length
        const present = st.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length
        const pct = total > 0 ? Math.round((present / total) * 100) : 100
        return {
          id: st.studentCode,
          dbId: st.id,
          name: st.name,
          grade: `${st.schoolClass.name} · ${st.section.name}`,
          program: st.program,
          attendance: `${pct}%`,
          status: st.status === 'REVIEW' ? 'Review' : 'Active',
          initials: st.initials,
        }
      })
    }

    return NextResponse.json({
      user: {
        id: session.userId,
        role: session.role,
        name: session.name,
        email: session.email,
        initials: session.initials,
      },
      csrfToken: session.csrfToken,
      children,
      assignedStudents,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
