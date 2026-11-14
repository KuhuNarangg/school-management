import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import {
  assertGuardianStudentScope,
  assertTeacherSectionScope,
  assertTeacherStudentScope,
  getGuardianScope,
  getTeacherScope,
  handleApiError,
  HttpError,
  requireSession,
} from '@/lib/server/rbac'
import { logAudit } from '@/lib/server/audit'

const recordEntrySchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'Present', 'Absent', 'Late']),
})

const submitAttendanceSchema = z.object({
  sectionId: z.string().optional(),
  date: z.string().optional(),
  session: z.string().default('DAILY'),
  allowUpdate: z.boolean().optional().default(false),
  editReason: z.string().trim().optional(),
  records: z.array(recordEntrySchema).min(1, 'At least one attendance record is required.'),
})

const patchAttendanceSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().optional(),
  date: z.string().optional(),
  session: z.string().default('DAILY'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'Present', 'Absent', 'Late']),
  editReason: z.string().trim().optional(),
})

function normalizeStatus(s: string): 'PRESENT' | 'ABSENT' | 'LATE' {
  const upper = s.toUpperCase()
  if (upper === 'ABSENT') return 'ABSENT'
  if (upper === 'LATE') return 'LATE'
  return 'PRESENT'
}

function toUtcDateOnly(dateStr?: string): Date {
  if (!dateStr) {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  }
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Invalid attendance date.')
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher', 'guardian'])
    const url = new URL(request.url)
    const sectionId = url.searchParams.get('sectionId') || ''
    const studentId = url.searchParams.get('studentId') || ''
    const dateParam = url.searchParams.get('date') || ''
    const targetDate = dateParam ? toUtcDateOnly(dateParam) : toUtcDateOnly()

    if (session.role === 'teacher') {
      const scope = await getTeacherScope(session.userId)
      if (sectionId && !scope.sectionIds.includes(sectionId)) {
        throw new HttpError(404, 'Section not found.')
      }
      if (studentId) {
        await assertTeacherStudentScope(session.userId, studentId)
      }

      const activeSectionId = sectionId || scope.sectionIds[0] || ''
      const rosterStudents = activeSectionId
        ? await prisma.student.findMany({
            where: { sectionId: activeSectionId },
            include: {
              schoolClass: true,
              section: true,
              attendance: { select: { status: true, date: true, session: true } },
            },
            orderBy: { name: 'asc' },
          })
        : []

      const sections = await prisma.section.findMany({
        where: { id: { in: scope.sectionIds } },
        include: { schoolClass: true },
        orderBy: [{ schoolClass: { gradeLevel: 'asc' } }, { name: 'asc' }],
      })

      const roster = rosterStudents.map((st) => {
        const total = st.attendance.length
        const present = st.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length
        const pct = total > 0 ? Math.round((present / total) * 100) : 100
        const todayRec = st.attendance.find((a) => isSameUtcDay(new Date(a.date), targetDate))
        return {
          id: st.studentCode,
          dbId: st.id,
          name: st.name,
          initials: st.initials,
          grade: `${st.schoolClass.name} · ${st.section.name}`,
          sectionId: st.sectionId,
          attendance: `${pct}%`,
          status: st.status === 'REVIEW' ? ('Review' as const) : ('Active' as const),
          todayStatus: todayRec
            ? todayRec.status === 'PRESENT'
              ? 'Present'
              : todayRec.status === 'ABSENT'
                ? 'Absent'
                : 'Late'
            : null,
        }
      })

      return NextResponse.json({
        date: targetDate.toISOString().slice(0, 10),
        activeSectionId,
        sections: sections.map((s) => ({
          id: s.id,
          label: `${s.schoolClass.name} · Section ${s.name}`,
          room: s.room,
        })),
        roster,
      })
    }

    if (session.role === 'guardian') {
      const scope = await getGuardianScope(session.userId)
      if (studentId) {
        await assertGuardianStudentScope(session.userId, studentId)
      }

      const students = await prisma.student.findMany({
        where: {
          id: { in: scope.studentIds },
          ...(studentId ? { OR: [{ id: studentId }, { studentCode: studentId }] } : {}),
        },
        include: {
          schoolClass: true,
          section: true,
          attendance: {
            orderBy: { date: 'desc' },
            take: 30,
          },
        },
        orderBy: { name: 'asc' },
      })

      return NextResponse.json({
        childrenAttendance: students.map((st) => {
          const total = st.attendance.length
          const present = st.attendance.filter((a) => a.status === 'PRESENT').length
          const late = st.attendance.filter((a) => a.status === 'LATE').length
          const absent = st.attendance.filter((a) => a.status === 'ABSENT').length
          const pct = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100
          return {
            id: st.studentCode,
            dbId: st.id,
            name: st.name,
            initials: st.initials,
            grade: `${st.schoolClass.name} · ${st.section.name}`,
            percentage: `${pct}%`,
            presentCount: present,
            lateCount: late,
            absentCount: absent,
            records: st.attendance.map((r) => ({
              id: r.id,
              date: new Date(r.date).toISOString().slice(0, 10),
              session: r.session,
              status: r.status === 'PRESENT' ? 'Present' : r.status === 'ABSENT' ? 'Absent' : 'Late',
            })),
          }
        }),
      })
    }

    // Admin school-wide view
    const where: Record<string, unknown> = {}
    if (sectionId) where.sectionId = sectionId
    if (dateParam) where.date = targetDate

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        student: { include: { schoolClass: true, section: true } },
        markedBy: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { student: { name: 'asc' } }],
      take: 150,
    })

    return NextResponse.json({
      date: targetDate.toISOString().slice(0, 10),
      records: records.map((r) => ({
        id: r.id,
        studentId: r.student.studentCode,
        studentDbId: r.studentId,
        studentName: r.student.name,
        initials: r.student.initials,
        grade: `${r.student.schoolClass.name} · ${r.student.section.name}`,
        sectionId: r.sectionId,
        date: new Date(r.date).toISOString().slice(0, 10),
        session: r.session,
        status: r.status === 'PRESENT' ? 'Present' : r.status === 'ABSENT' ? 'Absent' : 'Late',
        markedBy: r.markedBy.name,
        editReason: r.editReason,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher'])
    const body = await request.json()
    const data = submitAttendanceSchema.parse(body)

    const targetDate = toUtcDateOnly(data.date)
    const todayUtc = toUtcDateOnly()
    const isHistorical = !isSameUtcDay(targetDate, todayUtc)

    if (isHistorical) {
      if (session.role !== 'admin') {
        throw new HttpError(403, 'Teachers can only record or edit same-day attendance.')
      }
      if (!data.editReason || data.editReason.length < 3) {
        throw new HttpError(400, 'A reason is required when modifying historical attendance.')
      }
    }

    if (session.role === 'teacher' && data.sectionId) {
      await assertTeacherSectionScope(session.userId, data.sectionId)
    }

    const teacherScope = session.role === 'teacher' ? await getTeacherScope(session.userId) : null

    // Resolve all students first and check scope
    const studentCodesOrIds = data.records.map((r) => r.studentId)
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

    for (const rec of data.records) {
      const st = studentMap.get(rec.studentId)
      if (!st) {
        throw new HttpError(404, `Student ${rec.studentId} not found.`)
      }
      if (session.role === 'teacher' && !teacherScope?.sectionIds.includes(st.sectionId)) {
        throw new HttpError(404, 'Student record not found in your assigned sections.')
      }
    }

    const saved = []
    for (const rec of data.records) {
      const st = studentMap.get(rec.studentId)!
      const status = normalizeStatus(rec.status)

      const existing = await prisma.attendanceRecord.findUnique({
        where: {
          studentId_date_session: {
            studentId: st.id,
            date: targetDate,
            session: data.session,
          },
        },
      })

      if (existing && !data.allowUpdate) {
        throw new HttpError(
          409,
          `Duplicate attendance: ${st.name} (${st.studentCode}) is already marked for ${targetDate
            .toISOString()
            .slice(0, 10)} (${data.session}).`,
        )
      }

      if (existing && data.allowUpdate) {
        const updated = await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status,
            markedById: session.userId,
            editReason: data.editReason || existing.editReason,
          },
        })
        saved.push(updated)
      } else {
        try {
          const created = await prisma.attendanceRecord.create({
            data: {
              studentId: st.id,
              sectionId: st.sectionId,
              date: targetDate,
              session: data.session,
              status,
              markedById: session.userId,
              editReason: data.editReason || null,
            },
          })
          saved.push(created)
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
            throw new HttpError(
              409,
              `Duplicate attendance record for ${st.name} on ${targetDate.toISOString().slice(0, 10)}.`,
            )
          }
          throw err
        }
      }
    }

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role.toUpperCase(),
      action: isHistorical ? 'ATTENDANCE_MODIFIED_HISTORICAL' : 'ATTENDANCE_RECORDED',
      entityType: 'Attendance',
      entityId: data.sectionId || saved[0]?.sectionId || 'batch',
      afterSummary: `Recorded ${saved.length} attendance record(s) for ${targetDate.toISOString().slice(0, 10)}${
        data.editReason ? ` · Reason: ${data.editReason}` : ''
      }`,
    })

    return NextResponse.json({
      savedCount: saved.length,
      date: targetDate.toISOString().slice(0, 10),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher'])
    const body = await request.json()
    const data = patchAttendanceSchema.parse(body)

    let existing = data.id
      ? await prisma.attendanceRecord.findUnique({ where: { id: data.id }, include: { student: true } })
      : null

    if (!existing && data.studentId && data.date) {
      const st = await prisma.student.findFirst({
        where: { OR: [{ id: data.studentId }, { studentCode: data.studentId }] },
      })
      if (st) {
        existing = await prisma.attendanceRecord.findUnique({
          where: {
            studentId_date_session: {
              studentId: st.id,
              date: toUtcDateOnly(data.date),
              session: data.session,
            },
          },
          include: { student: true },
        })
      }
    }

    if (!existing) {
      throw new HttpError(404, 'Attendance record not found.')
    }

    const todayUtc = toUtcDateOnly()
    const isHistorical = !isSameUtcDay(new Date(existing.date), todayUtc)

    if (session.role === 'teacher') {
      const scope = await getTeacherScope(session.userId)
      if (!scope.sectionIds.includes(existing.sectionId)) {
        throw new HttpError(404, 'Attendance record not found.')
      }
      if (isHistorical) {
        throw new HttpError(403, 'Teachers can only edit same-day attendance.')
      }
    } else if (isHistorical && (!data.editReason || data.editReason.length < 3)) {
      throw new HttpError(400, 'Admin historical attendance edits require a reason.')
    }

    const newStatus = normalizeStatus(data.status)
    const updated = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        markedById: session.userId,
        editReason: data.editReason || existing.editReason,
      },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role.toUpperCase(),
      action: 'ATTENDANCE_MODIFIED',
      entityType: 'AttendanceRecord',
      entityId: updated.id,
      beforeSummary: `status=${existing.status}`,
      afterSummary: `status=${updated.status}${data.editReason ? ` (Reason: ${data.editReason})` : ''}`,
    })

    return NextResponse.json({ record: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
