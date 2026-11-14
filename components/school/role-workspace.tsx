'use client'

import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarCheck2,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  Download,
  GraduationCap,
  HeartHandshake,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { attendanceSummary as fallbackAttendanceSummary, guardianChildren, schoolStudents, teacherStudents } from '@/lib/api/school'
import { ActiveChildContext } from '@/components/school/role-shell'
import type { SchoolRole, StudentRecord } from '@/lib/types'

const chartConfig = {
  present: { label: 'Present', color: 'var(--chart-1)' },
  absent: { label: 'Absent', color: 'var(--chart-2)' },
  late: { label: 'Late', color: 'var(--chart-3)' },
} satisfies ChartConfig

function readCsrfCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)northstar-csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

async function apiJson(url: string, options: RequestInit = {}) {
  const csrf = readCsrfCookie()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

const isOverview = (role: SchoolRole, section: string) =>
  (role === 'admin' && section === 'dashboard') ||
  (role === 'teacher' && section === 'today') ||
  (role === 'guardian' && section === 'home')

export function RoleWorkspace({ role, section }: { role: SchoolRole; section: string }) {
  if (isOverview(role, section)) return <RoleOverview role={role} />
  return <RoleDataPage role={role} section={section} />
}

type DashboardData = {
  user?: { name: string; email: string; initials: string }
  stats?: Record<string, string | number>
  attendanceSummary?: Array<{ day: string; present: number; absent: number; late: number }>
  recentStudents?: StudentRecord[]
  recentActivity?: Array<{ id: string; title: string; detail: string; time: string }>
  schedule?: Array<{ id: string; time: string; subject: string; group: string; room: string; tint: string; sectionId: string }>
  children?: Array<{
    id: string
    dbId: string
    name: string
    initials: string
    grade: string
    className: string
    sectionName: string
    program: string
    room: string
    attendance: string
    attendancePct: number
    status: 'Active' | 'Review'
    latestGrade: string
    latestSubjectDetail: string
    feeBalanceCents: number
    feeBalance: string
    nextDueDate: string
  }>
  totalFamilyBalance?: string
}

function RoleOverview({ role }: { role: SchoolRole }) {
  const router = useRouter()
  const [toast, setToast] = useState('')
  const [quickDialog, setQuickDialog] = useState('')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [quickAttendance, setQuickAttendance] = useState<Record<string, 'Present' | 'Absent'>>({})
  const [quickInput1, setQuickInput1] = useState('')
  const [quickInput2, setQuickInput2] = useState('')
  const [sectionsList, setSectionsList] = useState<Array<{ id: string; label: string; classId: string }>>([])
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const activeChild = useContext(ActiveChildContext)

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  const loadDashboard = useCallback(async () => {
    try {
      const data = (await apiJson('/api/dashboard')) as DashboardData
      setDashboard(data)
      if (role === 'teacher' && data.recentStudents) {
        const initialMap: Record<string, 'Present' | 'Absent'> = {}
        data.recentStudents.forEach((st) => {
          initialMap[st.id] = 'Present'
        })
        setQuickAttendance(initialMap)
      }
      if (role === 'admin') {
        const clsData = await apiJson('/api/classes')
        if (Array.isArray(clsData.sections) && clsData.sections.length > 0) {
          setSectionsList(clsData.sections)
          setSelectedSectionId(clsData.sections[0].id)
        }
      }
    } catch {
      // Keep graceful fallback
    }
  }, [role])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const teacherRoster = dashboard?.recentStudents || teacherStudents
  const presentCount =
    Object.values(quickAttendance).filter((v) => v === 'Present').length ||
    Number(dashboard?.stats?.attendanceMarkedCount ?? 1)

  const guardianChildDetails = useMemo(() => {
    if (dashboard?.children && dashboard.children.length > 0) {
      const match = dashboard.children.find((c) => c.id === activeChild?.id || c.name === activeChild?.name)
      return match || dashboard.children[0]
    }
    return null
  }, [dashboard?.children, activeChild])

  const activeChildIndex = Math.max(
    0,
    (dashboard?.children || guardianChildren).findIndex((child) => child.id === (guardianChildDetails?.id || activeChild.id)),
  )

  const values =
    role === 'admin'
      ? [
          {
            label: 'Total students',
            value: String(dashboard?.stats?.totalStudents ?? '60'),
            detail: String(dashboard?.stats?.totalStudentsDetail ?? '+12 enrolled this term'),
            icon: GraduationCap,
            tint: 'violet',
          },
          {
            label: 'Teaching staff',
            value: String(dashboard?.stats?.teachingStaff ?? '5'),
            detail: String(dashboard?.stats?.teachingStaffDetail ?? 'Across 4 departments'),
            icon: Users,
            tint: 'blue',
          },
          {
            label: 'Attendance today',
            value: String(dashboard?.stats?.attendanceToday ?? '95.2%'),
            detail: String(dashboard?.stats?.attendanceTodayDetail ?? '30-day school average'),
            icon: CalendarCheck2,
            tint: 'mint',
          },
          {
            label: 'Fees collected',
            value: String(dashboard?.stats?.feesCollected ?? '$17,250'),
            detail: String(dashboard?.stats?.feesCollectedDetail ?? 'Reconciled with ledger'),
            icon: Wallet,
            tint: 'amber',
          },
        ]
      : role === 'teacher'
        ? [
            {
              label: 'My students',
              value: String(dashboard?.stats?.myStudentsCount ?? teacherRoster.length),
              detail: String(dashboard?.stats?.myStudentsDetail ?? 'Across 2 assigned sections'),
              icon: Users,
              tint: 'mint',
            },
            {
              label: 'Classes today',
              value: String(dashboard?.stats?.classesTodayCount ?? '4'),
              detail: String(dashboard?.stats?.classesTodayDetail ?? 'Next class in 18 min'),
              icon: BookOpen,
              tint: 'blue',
            },
            {
              label: 'Attendance to mark',
              value: String(dashboard?.stats?.attendanceToMarkCount ?? Math.max(0, teacherRoster.length - presentCount)),
              detail: String(dashboard?.stats?.attendanceSectionLabel ?? 'Grade 10 · Section A'),
              icon: CalendarCheck2,
              tint: 'amber',
            },
            {
              label: 'Marks pending',
              value: String(dashboard?.stats?.marksPendingCount ?? '2'),
              detail: String(dashboard?.stats?.marksPendingDetail ?? 'Semester 1 finals'),
              icon: ClipboardCheck,
              tint: 'violet',
            },
          ]
        : [
            {
              label: 'Attendance this term',
              value: guardianChildDetails?.attendance || '96.7%',
              detail: `${guardianChildDetails?.name.split(' ')[0] || 'Olivia'} · ${guardianChildDetails?.className || 'Grade 10'}`,
              icon: CalendarCheck2,
              tint: 'blue',
            },
            {
              label: 'Latest result',
              value: guardianChildDetails?.latestGrade || 'A−',
              detail: guardianChildDetails?.latestSubjectDetail || 'Biology · Midterm',
              icon: GraduationCap,
              tint: 'mint',
            },
            {
              label: 'Upcoming items',
              value: '2',
              detail: 'Next exam schedule live',
              icon: BookOpen,
              tint: 'violet',
            },
            {
              label: 'Fee balance',
              value: guardianChildDetails?.feeBalance || '$1,250',
              detail: `Due ${guardianChildDetails?.nextDueDate || 'Oct 28'}`,
              icon: Wallet,
              tint: 'amber',
            },
          ]

  const quickActions =
    role === 'admin'
      ? ['Add student', 'Add teacher', 'Create invoice', 'Record payment', 'Create exam', 'View reports']
      : role === 'teacher'
        ? ['Mark attendance', 'Enter marks', 'My classes', 'Student performance']
        : ['View attendance', 'View results', 'Pay fees', 'Download report card']

  async function submitQuickDialog() {
    try {
      if (quickDialog === 'attendance') {
        const records = teacherRoster.map((st) => ({
          studentId: st.id,
          status: quickAttendance[st.id] || 'Present',
        }))
        await apiJson('/api/attendance', {
          method: 'POST',
          body: JSON.stringify({
            allowUpdate: true,
            records,
          }),
        })
        setQuickDialog('')
        notify(`Attendance saved · ${records.filter((r) => r.status === 'Present').length} present`)
        loadDashboard()
        return
      }
      if (quickDialog === 'Add student') {
        const sec = sectionsList.find((s) => s.id === selectedSectionId) || sectionsList[0]
        if (!sec || !quickInput1.trim()) {
          notify('Please enter a student name.')
          return
        }
        await apiJson('/api/students', {
          method: 'POST',
          body: JSON.stringify({
            name: quickInput1.trim(),
            program: quickInput2.trim() || 'Science',
            classId: sec.classId,
            sectionId: sec.id,
          }),
        })
        setQuickDialog('')
        setQuickInput1('')
        setQuickInput2('')
        notify('Student enrolled in database.')
        loadDashboard()
        return
      }
      if (quickDialog === 'Add teacher') {
        if (!quickInput1.trim()) {
          notify('Please enter a teacher name.')
          return
        }
        await apiJson('/api/teachers', {
          method: 'POST',
          body: JSON.stringify({
            name: quickInput1.trim(),
            email: quickInput2.trim() || `${quickInput1.trim().toLowerCase().replace(/\s+/g, '.')}@school.demo`,
            department: 'Science',
          }),
        })
        setQuickDialog('')
        setQuickInput1('')
        setQuickInput2('')
        notify('Teacher added to database.')
        loadDashboard()
        return
      }
      if (quickDialog === 'Create exam') {
        if (!quickInput1.trim()) {
          notify('Please enter an exam name.')
          return
        }
        await apiJson('/api/exams', {
          method: 'POST',
          body: JSON.stringify({
            name: quickInput1.trim(),
            term: quickInput2.trim() || 'Term 2',
          }),
        })
        setQuickDialog('')
        setQuickInput1('')
        setQuickInput2('')
        notify('Examination created in database.')
        loadDashboard()
        return
      }
      if (quickDialog === 'Create invoice') {
        await apiJson('/api/fees/invoices', {
          method: 'POST',
          body: JSON.stringify({
            studentId: quickInput1.trim() || 'STU-24018',
            title: quickInput2.trim() || 'Term 2 tuition',
            amountCents: 125000,
          }),
        })
        setQuickDialog('')
        setQuickInput1('')
        setQuickInput2('')
        notify('Invoice generated in database.')
        loadDashboard()
        return
      }
      setQuickDialog('')
      notify('Saved to workspace.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to save right now.')
    }
  }

  const scheduleRows = dashboard?.schedule?.length
    ? dashboard.schedule
    : [
        { id: '1', time: '08:30', subject: 'Biology', group: 'Grade 10 · A', room: 'Science lab', tint: 'mint', sectionId: '' },
        { id: '2', time: '10:15', subject: 'Biology', group: 'Grade 10 · B', room: 'Room 204', tint: 'blue', sectionId: '' },
        { id: '3', time: '11:45', subject: 'Physics', group: 'Grade 10 · A', room: 'Room 108', tint: 'violet', sectionId: '' },
        { id: '4', time: '01:30', subject: 'Physics', group: 'Grade 10 · B', room: 'Science lab', tint: 'amber', sectionId: '' },
      ]

  const chartRows = dashboard?.attendanceSummary || fallbackAttendanceSummary
  const recentList =
    role === 'guardian'
      ? dashboard?.children || [activeChild]
      : dashboard?.recentStudents || (role === 'admin' ? schoolStudents : teacherStudents)

  const firstName = dashboard?.user?.name?.split(' ')[0] || (role === 'admin' ? 'Alex' : role === 'teacher' ? 'Olivia' : 'Jamie')

  return (
    <div className={`workspace-overview overview-${role}`}>
      <section className="overview-greeting">
        <div>
          <span className="overview-date">
            <Sparkles size={13} /> MONDAY, OCTOBER 21, 2026
          </span>
          <h2>Good morning, {firstName}</h2>
          <p>
            {role === 'admin'
              ? 'Here’s what’s happening across your school today.'
              : role === 'teacher'
                ? 'A few priorities to help your classroom day run smoothly.'
                : 'A simple update on your family’s school day.'}
          </p>
        </div>
        {role === 'teacher' && (
          <div className="teacher-attendance-mini">
            <span>ATTENDANCE MARKED</span>
            <strong>
              {dashboard?.stats?.attendanceMarkedCount ?? presentCount} <small>/ {teacherRoster.length}</small>
            </strong>
            <button onClick={() => setQuickDialog('attendance')}>
              Mark attendance <ArrowRight size={14} />
            </button>
          </div>
        )}
        {role === 'guardian' && (
          <div className="family-day-chip">
            <span>{(guardianChildDetails?.name.split(' ')[0] || 'OLIVIA').toUpperCase()}’S CLASSROOM</span>
            <strong>
              {guardianChildDetails?.program || 'Science'} · {guardianChildDetails?.grade || 'Grade 10 · A'}
            </strong>
            <small>{guardianChildDetails?.room || 'Science lab'}</small>
          </div>
        )}
      </section>
      <section className="workspace-stats">
        {values.map(({ label, value, detail, icon: Icon, tint }) => (
          <Card key={label} className="workspace-stat">
            <CardContent>
              <span className={`workspace-stat-icon stat-tint-${tint}`}>
                <Icon size={17} />
              </span>
              <span className="workspace-stat-trend">
                <ArrowUpRight size={13} />
                {detail.split(' ').slice(0, 1)}
              </span>
              <small>{label}</small>
              <strong>{value}</strong>
              <span>{detail}</span>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="workspace-quick-actions">
        <div>
          <h3>Quick actions</h3>
          <span>Everything you need, one tap away.</span>
        </div>
        <div className="quick-action-chips">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() =>
                action === 'View reports'
                  ? router.push('/admin/reports')
                  : action === 'Enter marks'
                    ? router.push('/teacher/marks')
                    : action === 'Mark attendance'
                      ? setQuickDialog('attendance')
                      : action === 'View attendance'
                        ? router.push('/guardian/attendance')
                        : action === 'View results'
                          ? router.push('/guardian/results')
                          : action === 'Pay fees'
                            ? router.push('/guardian/fees')
                            : action === 'Record payment'
                              ? router.push('/admin/fees')
                              : action === 'Download report card'
                                ? router.push('/guardian/results')
                                : action === 'Student performance'
                                  ? router.push('/teacher/performance')
                                  : action === 'My classes'
                                    ? router.push('/teacher/classes')
                                    : setQuickDialog(action)
              }
            >
              <Plus size={14} />
              {action}
            </button>
          ))}
        </div>
      </section>
      {role === 'admin' && (
        <section className="workspace-panel-grid">
          <Card className="workspace-chart-card">
            <CardHeader>
              <div>
                <CardTitle>Enrollment overview</CardTitle>
                <p>Student attendance snapshot · This week</p>
              </div>
              <button className="workspace-filter-button">
                This week <ChevronDown size={14} />
              </button>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="workspace-area-chart">
                <AreaChart accessibilityLayer data={chartRows} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="schoolPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-present)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-present)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 4" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8c98a5', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c98a5', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="present" stroke="var(--color-present)" strokeWidth={2.5} fill="url(#schoolPresent)" />
                  <Area type="monotone" dataKey="absent" stroke="var(--color-absent)" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ChartContainer>
              <div className="workspace-chart-legend">
                <span>
                  <i /> Present
                </span>
                <span>
                  <i /> Absent
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="workspace-side-panel">
            <CardHeader>
              <div>
                <CardTitle>Today at a glance</CardTitle>
                <p>Monday, October 21</p>
              </div>
              <CalendarCheck2 size={17} />
            </CardHeader>
            <CardContent>
              <div className="overview-event">
                <span>08:30</span>
                <i />
                <div>
                  <strong>Morning assembly</strong>
                  <small>Main auditorium</small>
                </div>
              </div>
              <div className="overview-event">
                <span>10:00</span>
                <i />
                <div>
                  <strong>Parent–teacher meeting</strong>
                  <small>Room 204 · Grade 10</small>
                </div>
              </div>
              <div className="overview-event">
                <span>11:30</span>
                <i />
                <div>
                  <strong>Science fair review</strong>
                  <small>Innovation lab</small>
                </div>
              </div>
              <Link href="/admin/attendance">
                View full schedule <ArrowRight size={14} />
              </Link>
            </CardContent>
          </Card>
        </section>
      )}
      {role === 'teacher' && (
        <section className="workspace-panel-grid">
          <Card className="workspace-schedule-card">
            <CardHeader>
              <div>
                <CardTitle>Today’s classes</CardTitle>
                <p>Your teaching schedule · Assigned sections</p>
              </div>
              <Link href="/teacher/classes">
                Full schedule <ArrowRight size={14} />
              </Link>
            </CardHeader>
            <CardContent>
              {scheduleRows.map((item, index) => (
                <div className={`teacher-class-row ${index === 0 ? 'teacher-next-class' : ''}`} key={`${item.time}-${item.subject}-${index}`}>
                  <span className="class-time">{item.time}</span>
                  <span className={`class-mark class-mark-${item.tint}`}>
                    <BookOpen size={16} />
                  </span>
                  <div>
                    <strong>{item.subject}</strong>
                    <span>
                      {item.group} · {item.room}
                    </span>
                  </div>
                  {index === 0 && <Badge className="next-class-badge">NEXT</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="workspace-side-panel teacher-pending">
            <CardHeader>
              <div>
                <CardTitle>Needs your attention</CardTitle>
                <p>A few things to wrap up</p>
              </div>
              <span className="pending-dot">3</span>
            </CardHeader>
            <CardContent>
              <Link href="/teacher/attendance">
                <span className="attention-icon attention-amber">
                  <CalendarCheck2 size={16} />
                </span>
                <span>
                  <strong>Attendance to mark</strong>
                  <small>{String(dashboard?.stats?.attendanceSectionLabel ?? 'Grade 10 · Section A')}</small>
                </span>
                <ArrowRight size={15} />
              </Link>
              <Link href="/teacher/marks">
                <span className="attention-icon attention-violet">
                  <ClipboardCheck size={16} />
                </span>
                <span>
                  <strong>Marks to finish</strong>
                  <small>{String(dashboard?.stats?.marksPendingDetail ?? 'Semester 1 finals')}</small>
                </span>
                <ArrowRight size={15} />
              </Link>
              <Link href="/teacher/performance">
                <span className="attention-icon attention-blue">
                  <Activity size={16} />
                </span>
                <span>
                  <strong>Student check-in</strong>
                  <small>{String(dashboard?.stats?.reviewStudentsCount ?? 1)} student(s) in review</small>
                </span>
                <ArrowRight size={15} />
              </Link>
              <div className="teacher-class-note">
                <ShieldCheck size={15} /> Showing only your assigned classes from the database.
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      {role === 'guardian' && (
        <section className="guardian-family-grid">
          <div className="guardian-child-cards">
            {[guardianChildDetails || activeChild].map((child) => {
              const index = activeChildIndex
              const attVal = String(child.attendance || '97%')
              const latestRes =
                'latestGrade' in child && typeof child.latestGrade === 'string'
                  ? child.latestGrade
                  : index === 0
                    ? 'A−'
                    : 'B+'
              const latestSub =
                'latestSubjectDetail' in child && typeof child.latestSubjectDetail === 'string'
                  ? child.latestSubjectDetail
                  : 'Biology · Midterm'
              const roomVal =
                'room' in child && typeof child.room === 'string' ? child.room : 'Homeroom'
              return (
                <Card className="guardian-child-card" key={child.id}>
                  <CardHeader>
                    <div className={`guardian-large-avatar guardian-large-avatar-${index}`}>{child.initials.slice(0, 1)}</div>
                    <div>
                      <span>{child.grade.toUpperCase()}</span>
                      <CardTitle>{child.name}</CardTitle>
                      <p>
                        {child.program} · {roomVal}
                      </p>
                    </div>
                    <button className="child-more" aria-label={`More about ${child.name}`}>
                      <MoreHorizontal size={17} />
                    </button>
                  </CardHeader>
                  <CardContent>
                    <div className="child-attendance">
                      <div>
                        <span>ATTENDANCE</span>
                        <strong>{attVal}</strong>
                      </div>
                      <div className="child-progress">
                        <i style={{ width: attVal }} />
                      </div>
                      <small>Excellent · on track this term</small>
                    </div>
                    <div className="child-latest-result">
                      <span>
                        <GraduationCap size={16} /> Latest published result
                      </span>
                      <strong>
                        {latestRes}
                        <small> {latestSub}</small>
                      </strong>
                    </div>
                  </CardContent>
                  <footer>
                    <Link href="/guardian/results">
                      View learning progress <ArrowRight size={14} />
                    </Link>
                  </footer>
                </Card>
              )
            })}
          </div>
          <div className="guardian-side-stack">
            <Card className="fee-reminder-card">
              <CardContent>
                <div className="fee-reminder-top">
                  <span>
                    <Wallet size={16} /> FEE REMINDER
                  </span>
                  <Badge>{(guardianChildDetails?.feeBalanceCents ?? 125000) > 0 ? 'Due soon' : 'Paid'}</Badge>
                </div>
                <strong>
                  {guardianChildDetails?.feeBalance || '$1,250'} <small>outstanding</small>
                </strong>
                <p>
                  {guardianChildDetails?.name.split(' ')[0] || 'Olivia'}’s balance · Due {guardianChildDetails?.nextDueDate || 'Oct 28'}.
                </p>
                <Link href="/guardian/fees">
                  View fee details <ArrowRight size={14} />
                </Link>
              </CardContent>
            </Card>
            <Card className="family-next-card">
              <CardHeader>
                <div>
                  <CardTitle>Coming up</CardTitle>
                  <p>The next few days at school</p>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <span>
                    OCT <strong>28</strong>
                  </span>
                  <p>
                    <b>Midterm results published</b>
                    <small>{guardianChildDetails?.name.split(' ')[0] || 'Olivia'} · Term 2</small>
                  </p>
                </div>
                <div>
                  <span>
                    DEC <strong>08</strong>
                  </span>
                  <p>
                    <b>Semester 1 finals begin</b>
                    <small>All grades · Scheduled</small>
                  </p>
                </div>
                <Link href="/guardian/attendance">
                  See attendance history <ArrowRight size={14} />
                </Link>
              </CardContent>
            </Card>
            <div className="guardian-reassurance">
              <HeartHandshake size={17} />
              <span>
                <strong>Everyone’s in the loop.</strong>
                <small>Synced with Northstar database</small>
              </span>
              <Check size={16} />
            </div>
          </div>
        </section>
      )}
      <section className="overview-recent">
        <Card className="recent-records">
          <CardHeader>
            <div>
              <CardTitle>
                {role === 'admin' ? 'Recently enrolled students' : role === 'teacher' ? 'Your assigned students' : 'Your children'}
              </CardTitle>
              <p>
                {role === 'admin'
                  ? 'A quick look at recent student activity'
                  : role === 'teacher'
                    ? 'Students in your assigned sections only'
                    : 'Student information shared with your family'}
              </p>
            </div>
            <Link href={role === 'admin' ? '/admin/students' : role === 'teacher' ? '/teacher/classes' : '/guardian/results'}>
              View all <ArrowRight size={14} />
            </Link>
          </CardHeader>
          <CardContent>
            {recentList.slice(0, 5).map((student) => (
              <div className="recent-student-row" key={student.id}>
                <Avatar className="recent-student-avatar">
                  <AvatarFallback>{student.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <strong>{student.name}</strong>
                  <small>
                    {student.grade} · {student.id}
                  </small>
                </div>
                {role !== 'guardian' && <span className="recent-attendance">{student.attendance} attendance</span>}
                <Badge className={student.status === 'Active' ? 'record-status-active' : 'record-status-review'}>
                  <span />
                  {student.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        {role !== 'guardian' && (
          <Card className="recent-activity-card">
            <CardHeader>
              <div>
                <CardTitle>Recent activity</CardTitle>
                <p>Live audit feed from your school</p>
              </div>
              <Activity size={17} />
            </CardHeader>
            <CardContent>
              {(dashboard?.recentActivity && dashboard.recentActivity.length > 0
                ? dashboard.recentActivity
                : [
                    { id: '1', title: 'Student created', detail: 'Emma Thompson joined Grade 9', time: '12 minutes ago' },
                    { id: '2', title: 'Attendance recorded', detail: 'Submitted Grade 10 · Section A', time: '38 minutes ago' },
                    { id: '3', title: 'Payment recorded', detail: 'INV-24016 · $1,250.00', time: '1 hour ago' },
                  ]
              ).map((item, idx) => (
                <div key={item.id}>
                  <span
                    className={`activity-marker ${
                      idx === 0 ? 'activity-marker-green' : idx === 1 ? 'activity-marker-blue' : 'activity-marker-amber'
                    }`}
                  >
                    {idx === 0 ? <Check size={14} /> : idx === 1 ? <ClipboardCheck size={14} /> : <Wallet size={14} />}
                  </span>
                  <p>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                    <time>{item.time}</time>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
      <Dialog open={!!quickDialog} onOpenChange={(open) => !open && setQuickDialog('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{quickDialog === 'attendance' ? 'Mark today’s attendance' : quickDialog}</DialogTitle>
            <DialogDescription>
              {quickDialog === 'attendance'
                ? 'Submit today’s attendance for your assigned roster directly to PostgreSQL.'
                : 'Enter details below to save directly to the school database.'}
            </DialogDescription>
          </DialogHeader>
          {quickDialog === 'attendance' ? (
            <div className="attendance-quick-list">
              {teacherRoster.slice(0, 8).map((student) => {
                const isPres = (quickAttendance[student.id] || 'Present') === 'Present'
                return (
                  <div key={student.id}>
                    <span>
                      {student.name} <small>({student.id})</small>
                    </span>
                    <button
                      className={isPres ? 'attendance-present' : ''}
                      onClick={() =>
                        setQuickAttendance((curr) => ({
                          ...curr,
                          [student.id]: (curr[student.id] || 'Present') === 'Present' ? 'Absent' : 'Present',
                        }))
                      }
                    >
                      {isPres ? 'Present' : 'Absent'}
                    </button>
                  </div>
                )
              })}
              <button className="attendance-submit" onClick={submitQuickDialog}>
                Save attendance
              </button>
            </div>
          ) : (
            <div className="quick-dialog-placeholder">
              <Input
                aria-label="Name or title"
                value={quickInput1}
                onChange={(e) => setQuickInput1(e.target.value)}
                placeholder={
                  quickDialog === 'Create invoice'
                    ? 'Student ID (e.g. STU-24018)'
                    : quickDialog === 'Create exam'
                      ? 'Examination name'
                      : 'Full name'
                }
              />
              <Input
                aria-label="Secondary detail"
                value={quickInput2}
                onChange={(e) => setQuickInput2(e.target.value)}
                placeholder={
                  quickDialog === 'Add teacher'
                    ? 'Email address (optional)'
                    : quickDialog === 'Create invoice'
                      ? 'Invoice description (e.g. Term 2 tuition)'
                      : quickDialog === 'Create exam'
                        ? 'Term (e.g. Term 2)'
                        : 'Academic program (Science, Arts, Commerce)'
                }
              />
              {quickDialog === 'Add student' && sectionsList.length > 0 && (
                <select
                  aria-label="Class Section"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  style={{ height: 35, border: '1px solid #e1e7e4', borderRadius: 6, padding: '0 9px', fontSize: 10 }}
                >
                  {sectionsList.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={submitQuickDialog}>Save to database</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {toast && (
        <div role="status" className="workspace-toast">
          <Check size={15} />
          {toast}
          <button onClick={() => setToast('')}>Dismiss</button>
        </div>
      )}
    </div>
  )
}

type InvoiceRecord = {
  id: string
  dbId?: string
  studentId?: string
  family: string
  learner: string
  description: string
  due: string
  totalCents?: number
  paidCents?: number
  outstandingCents?: number
  amount: string
  paidAmount?: string
  outstandingAmount?: string
  status: string
  rawStatus?: string
  payments?: Array<{
    id: string
    receiptNo: string
    amount: string
    amountCents: number
    method: string
    type: string
  }>
}

type ExamRow = {
  id: string
  name: string
  grade: string
  date: string
  completed: string
  state: string
  status: string
  locked: boolean
}

function RoleDataPage({ role, section }: { role: SchoolRole; section: string }) {
  const activeChild = useContext(ActiveChildContext)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [showEmail, setShowEmail] = useState(true)
  const [payment, setPayment] = useState<InvoiceRecord | null>(null)
  const [paymentAmountInput, setPaymentAmountInput] = useState('')
  const [paymentMethodInput, setPaymentMethodInput] = useState('Bank transfer')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [rosterIndex, setRosterIndex] = useState(0)
  const [marks, setMarks] = useState<Record<string, string>>({})

  // Live API states
  const [studentsData, setStudentsData] = useState<StudentRecord[]>(
    role === 'admin' ? schoolStudents : role === 'teacher' ? teacherStudents : guardianChildren,
  )
  const [invoicesData, setInvoicesData] = useState<InvoiceRecord[]>([])
  const [feeSummary, setFeeSummary] = useState({
    totalInvoiced: '$29,570',
    totalCollected: '$16,250',
    totalOutstanding: '$13,320',
    totalOutstandingFixed: '$1,250.00',
    collectionRatePct: 55,
    unpaidCount: 12,
  })
  const [examsData, setExamsData] = useState<ExamRow[]>([])
  const [teachersData, setTeachersData] = useState<
    Array<{ id: string; dbId: string; name: string; email: string; initials: string; department: string; qualification: string; assignmentCount: number; status: string }>
  >([])
  const [guardiansData, setGuardiansData] = useState<
    Array<{ id: string; dbId: string; name: string; email: string; initials: string; phone: string; childrenCount: number; children: Array<{ id: string; name: string; grade: string }>; status: string }>
  >([])
  const [sectionsData, setSectionsData] = useState<
    Array<{ id: string; name: string; label: string; classId: string; className: string; room: string; capacity: number; studentCount: number; subjects: string[] }>
  >([])
  const [subjectsData, setSubjectsData] = useState<
    Array<{ id: string; dbId: string; code: string; name: string; department: string; maxMarksDefault: number; passingMarksDefault: number; classes: string[] }>
  >([])
  const [assignmentsData, setAssignmentsData] = useState<
    Array<{ id: string; teacherCode: string; teacherName: string; teacherEmail: string; grade: string; subjectName: string; scheduleTime: string; scheduleRoom: string }>
  >([])
  const [resultsData, setResultsData] = useState<
    Array<{
      studentId: string
      name: string
      email: string
      initials: string
      grade: string
      program: string
      attendance: string
      status: 'Active' | 'Review'
      totalObtained: number
      totalMax: number
      overallPercentage: number
      overallGrade: string
      passFail: string
      subjects: Array<{
        examName: string
        subjectName: string
        marksObtained: number
        maxMarks: number
        percentage: number
        grade: string
        passed: boolean
      }>
    }>
  >([])
  const [auditLogsData, setAuditLogsData] = useState<
    Array<{ id: string; actorName: string; actorRole: string; action: string; entityType: string; entityId: string; afterSummary: string | null; timestamp: string }>
  >([])
  const [reportsData, setReportsData] = useState<Array<Record<string, string | number>>>([])
  const [reportType, setReportType] = useState('student')
  const [schoolSettings, setSchoolSettings] = useState({
    schoolName: 'Northstar Academy',
    city: 'Springfield, IL',
    academicYear: '2026-2027',
    currentTerm: 'Term 2',
    contactEmail: 'hello@northstar.school',
  })
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: role,
    phone: '',
  })
  const [activeAttendanceSectionId, setActiveAttendanceSectionId] = useState('')
  const [activeMarksExamId, setActiveMarksExamId] = useState('')
  const [activeMarksSubjectName, setActiveMarksSubjectName] = useState('Biology')
  const [adminAttendanceRows, setAdminAttendanceRows] = useState<
    Array<{ id: string; studentId: string; studentName: string; initials: string; grade: string; date: string; status: string; markedBy: string }>
  >([])
  const [guardianAttendanceChildren, setGuardianAttendanceChildren] = useState<
    Array<{ id: string; name: string; grade: string; percentage: string; presentCount: number; lateCount: number; absentCount: number; records: Array<{ id: string; date: string; status: string }> }>
  >([])

  // Create form fields
  const [formField1, setFormField1] = useState('')
  const [formField2, setFormField2] = useState('')
  const [formField3, setFormField3] = useState('')
  const [formField4, setFormField4] = useState('')
  const [unlockModalExam, setUnlockModalExam] = useState<ExamRow | null>(null)
  const [unlockReasonInput, setUnlockReasonInput] = useState('')

  const title = section
    .split('-')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
  const isStudentPage = section === 'students' || section === 'classes' || section === 'performance' || section === 'results'
  const isFeePage = section === 'fees'
  const isAttendancePage = section === 'attendance'
  const isMarksPage = section === 'marks'
  const isExamPage = section === 'examinations'

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }, [])

  const loadSectionData = useCallback(async () => {
    try {
      if (section === 'students' || (role === 'teacher' && (section === 'classes' || section === 'performance'))) {
        const [stRes, clsRes] = await Promise.all([
          apiJson('/api/students?pageSize=100'),
          apiJson('/api/classes').catch(() => ({ sections: [] })),
        ])
        if (Array.isArray(stRes.students)) setStudentsData(stRes.students)
        if (Array.isArray(clsRes.sections)) {
          setSectionsData(clsRes.sections)
          if (!formField3 && clsRes.sections[0]) setFormField3(clsRes.sections[0].id)
        }
      }

      if (section === 'classes' && role === 'admin') {
        const clsRes = await apiJson('/api/classes')
        if (Array.isArray(clsRes.sections)) setSectionsData(clsRes.sections)
      }

      if (section === 'guardians') {
        const [gRes, stRes] = await Promise.all([
          apiJson('/api/guardians'),
          apiJson('/api/students?pageSize=100').catch(() => ({ students: [] })),
        ])
        if (Array.isArray(gRes.guardians)) setGuardiansData(gRes.guardians)
        if (Array.isArray(stRes.students)) setStudentsData(stRes.students)
      }

      if (section === 'teachers') {
        const tRes = await apiJson('/api/teachers')
        if (Array.isArray(tRes.teachers)) setTeachersData(tRes.teachers)
      }

      if (section === 'subjects') {
        const sRes = await apiJson('/api/subjects')
        if (Array.isArray(sRes.subjects)) setSubjectsData(sRes.subjects)
      }

      if (section === 'assignments') {
        const [aRes, tRes, cRes, sRes] = await Promise.all([
          apiJson('/api/assignments'),
          apiJson('/api/teachers').catch(() => ({ teachers: [] })),
          apiJson('/api/classes').catch(() => ({ sections: [] })),
          apiJson('/api/subjects').catch(() => ({ subjects: [] })),
        ])
        if (Array.isArray(aRes.assignments)) setAssignmentsData(aRes.assignments)
        if (Array.isArray(tRes.teachers)) setTeachersData(tRes.teachers)
        if (Array.isArray(cRes.sections)) setSectionsData(cRes.sections)
        if (Array.isArray(sRes.subjects)) setSubjectsData(sRes.subjects)
      }

      if (isAttendancePage) {
        if (role === 'teacher') {
          const attRes = await apiJson(
            `/api/attendance${activeAttendanceSectionId ? `?sectionId=${activeAttendanceSectionId}` : ''}`,
          )
          if (Array.isArray(attRes.sections)) setSectionsData(attRes.sections)
          if (attRes.activeSectionId && !activeAttendanceSectionId) {
            setActiveAttendanceSectionId(attRes.activeSectionId)
          }
          if (Array.isArray(attRes.roster)) {
            setStudentsData(attRes.roster)
            const initialAtt: Record<string, string> = {}
            attRes.roster.forEach((r: { id: string; todayStatus: string | null }) => {
              if (r.todayStatus) initialAtt[r.id] = r.todayStatus
            })
            setAttendance(initialAtt)
          }
        } else if (role === 'guardian') {
          const attRes = await apiJson('/api/attendance')
          if (Array.isArray(attRes.childrenAttendance)) {
            setGuardianAttendanceChildren(attRes.childrenAttendance)
          }
        } else {
          const [attRes, stRes] = await Promise.all([
            apiJson('/api/attendance'),
            apiJson('/api/students?pageSize=100'),
          ])
          if (Array.isArray(attRes.records)) setAdminAttendanceRows(attRes.records)
          if (Array.isArray(stRes.students)) setStudentsData(stRes.students)
        }
      }

      if (isMarksPage) {
        const mRes = await apiJson(`/api/marks${activeMarksExamId ? `?examId=${activeMarksExamId}` : ''}`)
        if (mRes.activeExam && !activeMarksExamId) {
          setActiveMarksExamId(mRes.activeExam.id)
        }
        if (mRes.examSubject?.subjectName) {
          setActiveMarksSubjectName(mRes.examSubject.subjectName)
        }
        if (Array.isArray(mRes.roster)) {
          const rStudents: StudentRecord[] = mRes.roster.map(
            (r: { studentId: string; name: string; initials: string; grade: string }) => ({
              id: r.studentId,
              name: r.name,
              initials: r.initials,
              grade: mRes.section?.label || 'Grade 10 · Section A',
              program: 'Science',
              attendance: '96%',
              status: 'Active',
            }),
          )
          setStudentsData(rStudents)
          const initialMarks: Record<string, string> = {}
          mRes.roster.forEach((r: { studentId: string; marksObtained: number | null }) => {
            if (r.marksObtained !== null && r.marksObtained !== undefined) {
              initialMarks[r.studentId] = String(r.marksObtained)
            }
          })
          setMarks(initialMarks)
        }
      }

      if (isExamPage) {
        const exRes = await apiJson('/api/exams')
        if (Array.isArray(exRes.exams)) setExamsData(exRes.exams)
      }

      if (section === 'results' || section === 'performance') {
        const rRes = await apiJson('/api/results')
        if (Array.isArray(rRes.results)) {
          setResultsData(rRes.results)
          setStudentsData(
            rRes.results.map(
              (r: {
                studentId: string
                name: string
                initials: string
                grade: string
                program: string
                overallGrade: string
                overallPercentage: number
                passFail: string
                status: 'Active' | 'Review'
              }) => ({
                id: r.studentId,
                name: r.name,
                initials: r.initials,
                grade: r.grade,
                program: `${r.overallGrade} (${r.overallPercentage}%)`,
                attendance: r.passFail,
                status: r.status,
              }),
            ),
          )
        }
      }

      if (isFeePage) {
        const feeRes = await apiJson('/api/fees/invoices')
        if (Array.isArray(feeRes.invoices)) setInvoicesData(feeRes.invoices)
        if (feeRes.summary) setFeeSummary(feeRes.summary)
      }

      if (section === 'reports') {
        const repRes = await apiJson(`/api/reports?type=${reportType}`)
        if (Array.isArray(repRes.rows)) setReportsData(repRes.rows)
      }

      if (section === 'audit-logs') {
        const logRes = await apiJson('/api/audit-logs')
        if (Array.isArray(logRes.logs)) setAuditLogsData(logRes.logs)
      }

      if (section === 'settings') {
        const setRes = await apiJson('/api/settings')
        if (setRes.settings) setSchoolSettings(setRes.settings)
      }

      if (section === 'profile') {
        const profRes = await apiJson('/api/profile')
        if (profRes.profile) setProfileData(profRes.profile)
      }
    } catch {
      // Fallback gracefully
    }
  }, [
    section,
    role,
    isAttendancePage,
    isMarksPage,
    isExamPage,
    isFeePage,
    activeAttendanceSectionId,
    activeMarksExamId,
    reportType,
    formField3,
  ])

  useEffect(() => {
    loadSectionData()
  }, [loadSectionData])

  const filteredStudents = useMemo(
    () =>
      studentsData.filter((student) => {
        if (role === 'guardian' && activeChild?.id && (section === 'results' || section === 'attendance')) {
          if (student.id !== activeChild.id && student.name !== activeChild.name) return false
        }
        const matchesSearch = `${student.name} ${student.grade} ${student.id} ${student.program}`
          .toLowerCase()
          .includes(search.toLowerCase())
        const matchesFilter =
          filter === 'All' || filter === 'Active'
            ? filter === 'All' || student.status === 'Active'
            : filter === 'Grade 10'
              ? student.grade.includes('10')
              : student.status === 'Review'
        return matchesSearch && matchesFilter
      }),
    [studentsData, search, filter, role, activeChild, section],
  )

  const studentTableTitle =
    section === 'results'
      ? role === 'guardian'
        ? `${activeChild?.name || 'Child'}’s Published Report Card`
        : 'Published & Draft Examination Results'
      : section === 'guardians'
        ? 'Guardian & Family Directory'
        : section === 'teachers'
          ? 'Teaching Staff Directory'
          : section === 'classes' && role === 'admin'
            ? 'Classes & Sections'
            : section === 'subjects'
              ? 'Subject Catalog'
              : section === 'assignments'
                ? 'Teacher Class & Subject Assignments'
                : section === 'reports'
                  ? `School Report · ${reportType.replace('-', ' ').toUpperCase()}`
                  : section === 'audit-logs'
                    ? 'Immutable System Audit Log'
                    : role === 'teacher'
                      ? 'Assigned students'
                      : role === 'guardian'
                        ? 'Family student records'
                        : 'Student directory'

  const pageAction = isAttendancePage
    ? role === 'teacher'
      ? 'Mark all present'
      : 'Export attendance'
    : isFeePage
      ? role === 'guardian'
        ? 'Pay outstanding fees'
        : 'Create invoice'
      : isMarksPage
        ? 'Save marks'
        : isExamPage
          ? role === 'admin'
            ? 'Create examination'
            : 'Submit marks'
          : section === 'reports'
            ? 'Export CSV report'
            : `Add ${title.toLowerCase().replace(/s$/, '')}`

  const studentColumns =
    section === 'results'
      ? ['Student', 'Grade', 'Program', 'Attendance', 'Status']
      : ['Student', 'Grade', 'Program', 'Attendance', 'Status']

  useEffect(() => {
    if (!isAttendancePage || role !== 'teacher') return
    function onRosterKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const len = Math.max(1, studentsData.length)
        const next = (rosterIndex + (event.key === 'ArrowDown' ? 1 : -1) + len) % len
        setRosterIndex(next)
        requestAnimationFrame(() =>
          document.querySelectorAll<HTMLElement>('.attendance-student')[next]?.querySelector('button')?.focus(),
        )
      }
      const status = { p: 'Present', a: 'Absent', l: 'Late' }[event.key.toLowerCase() as 'p' | 'a' | 'l']
      if (status && studentsData[rosterIndex]) {
        event.preventDefault()
        setAttendance((current) => ({ ...current, [studentsData[rosterIndex].id]: status }))
      }
    }
    window.addEventListener('keydown', onRosterKey)
    return () => window.removeEventListener('keydown', onRosterKey)
  }, [isAttendancePage, role, rosterIndex, studentsData])

  const saveAttendance = async () => {
    try {
      const entries = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }))
      if (entries.length === 0) return
      await apiJson('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: activeAttendanceSectionId || undefined,
          allowUpdate: true,
          records: entries,
        }),
      })
      showToast('Attendance submitted to database.')
      loadSectionData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit attendance.')
    }
  }

  const saveMarksToDb = async (submitStatus: 'DRAFT' | 'SUBMITTED' = 'DRAFT') => {
    try {
      const entries = Object.entries(marks)
        .filter(([, val]) => val !== '' && !Number.isNaN(Number(val)))
        .map(([studentId, val]) => ({
          studentId,
          marksObtained: Number(val),
        }))
      if (entries.length === 0) {
        showToast('Enter at least one student mark first.')
        return
      }
      await apiJson('/api/marks', {
        method: 'POST',
        body: JSON.stringify({
          examId: activeMarksExamId || undefined,
          status: submitStatus,
          entries,
        }),
      })
      showToast(
        submitStatus === 'SUBMITTED'
          ? 'Marks submitted for administrator review.'
          : 'Marks saved to database as draft.',
      )
      loadSectionData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save marks.')
    }
  }

  function exportCsv() {
    if (section === 'reports') {
      window.location.assign(`/api/reports?type=${reportType}&format=csv`)
      showToast('CSV report download started.')
      return
    }
    const rows = [
      ['Student', 'ID', 'Grade', 'Program', 'Attendance', 'Status'],
      ...filteredStudents.map(({ name, id, grade, program, attendance: value, status }) => [
        name,
        id,
        grade,
        program,
        value,
        status,
      ]),
    ]
    const csv = rows.map((row) => row.map((item) => `"${String(item).replaceAll('"', '""')}"`).join(',')).join('\n')
    const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `${section}-northstar.csv`
    anchor.click()
    URL.revokeObjectURL(href)
    showToast('CSV export downloaded.')
  }

  const action = () => {
    if (isAttendancePage && role === 'teacher') {
      setAttendance(Object.fromEntries(studentsData.map((student) => [student.id, 'Present'])))
      return
    }
    if (isAttendancePage || section === 'reports') return exportCsv()
    if (isFeePage && role === 'guardian') {
      const unpaidInv = invoicesData.find((inv) => inv.status !== 'Paid')
      if (unpaidInv) {
        setPayment(unpaidInv)
        setPaymentAmountInput(unpaidInv.outstandingAmount || unpaidInv.amount)
        return
      }
      return showToast('All family invoices are paid in full!')
    }
    if (isMarksPage) {
      saveMarksToDb('DRAFT')
      return
    }
    if (role === 'admin') {
      setFormField1('')
      setFormField2('')
      setFormField4('')
      setCreateDialogOpen(true)
      return
    }
    return showToast(`${pageAction} completed.`)
  }

  async function handleConfirmPayment() {
    if (!payment) return
    try {
      await apiJson('/api/fees/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: payment.id,
          amountDollars: paymentAmountInput || payment.outstandingAmount || payment.amount,
          method: paymentMethodInput,
        }),
      })
      setPayment(null)
      showToast('Payment recorded in ledger and invoice status updated.')
      loadSectionData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Payment rejected.')
    }
  }

  async function handleCreateSubmit() {
    try {
      if (section === 'students') {
        const sec = sectionsData.find((s) => s.id === formField3) || sectionsData[0]
        if (!sec) throw new Error('Select a section.')
        await apiJson('/api/students', {
          method: 'POST',
          body: JSON.stringify({
            name: formField1,
            email: formField2 || undefined,
            program: formField4 || 'Science',
            classId: sec.classId,
            sectionId: sec.id,
          }),
        })
        showToast('Student created in database.')
      } else if (section === 'guardians') {
        await apiJson('/api/guardians', {
          method: 'POST',
          body: JSON.stringify({
            name: formField1,
            email: formField2,
            phone: formField3 || '+1 (555) 300-8888',
            studentIds: formField4 ? [formField4] : [],
          }),
        })
        showToast('Guardian created and linked.')
      } else if (section === 'teachers') {
        await apiJson('/api/teachers', {
          method: 'POST',
          body: JSON.stringify({
            name: formField1,
            email: formField2,
            department: formField3 || 'Science',
            qualification: formField4 || 'M.Ed.',
          }),
        })
        showToast('Teacher added to directory.')
      } else if (section === 'classes') {
        await apiJson('/api/classes', {
          method: 'POST',
          body: JSON.stringify({
            name: formField1 || 'Grade 10',
            gradeLevel: Number(formField2) || 10,
            sectionName: formField3 || 'C',
            room: formField4 || 'Room 208',
          }),
        })
        showToast('Class section created.')
      } else if (section === 'subjects') {
        await apiJson('/api/subjects', {
          method: 'POST',
          body: JSON.stringify({
            code: formField1,
            name: formField2,
            department: formField3 || 'Science',
            maxMarksDefault: Number(formField4) || 100,
          }),
        })
        showToast('Subject added to catalog.')
      } else if (section === 'assignments') {
        await apiJson('/api/assignments', {
          method: 'POST',
          body: JSON.stringify({
            teacherId: formField1 || teachersData[0]?.id,
            sectionId: formField2 || sectionsData[0]?.id,
            subjectId: formField3 || subjectsData[0]?.dbId,
            scheduleTime: formField4 || '09:30',
          }),
        })
        showToast('Teacher assignment updated.')
      } else if (isFeePage) {
        await apiJson('/api/fees/invoices', {
          method: 'POST',
          body: JSON.stringify({
            studentId: formField1 || 'STU-24018',
            title: formField2 || 'Term 2 tuition',
            amountDollars: formField3 || '1250',
            dueDate: formField4 || '2026-10-28',
          }),
        })
        showToast('Invoice generated.')
      } else if (isExamPage) {
        await apiJson('/api/exams', {
          method: 'POST',
          body: JSON.stringify({
            name: formField1,
            term: formField2 || 'Term 2',
            startDate: formField3 || '2026-11-15',
            endDate: formField4 || '2026-11-22',
          }),
        })
        showToast('Examination created.')
      }
      setCreateDialogOpen(false)
      loadSectionData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save record.')
    }
  }

  async function handleExamStatusAction(exam: ExamRow, act: 'PUBLISH' | 'UNLOCK') {
    try {
      if (act === 'UNLOCK') {
        setUnlockModalExam(exam)
        setUnlockReasonInput('')
        return
      }
      await apiJson('/api/exams', {
        method: 'PATCH',
        body: JSON.stringify({ examId: exam.id, action: 'PUBLISH' }),
      })
      showToast(`${exam.name} published and locked. Visible to guardians now.`)
      loadSectionData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed.')
    }
  }

  async function confirmUnlockExam() {
    if (!unlockModalExam) return
    try {
      await apiJson('/api/exams', {
        method: 'PATCH',
        body: JSON.stringify({
          examId: unlockModalExam.id,
          action: 'UNLOCK',
          reason: unlockReasonInput,
        }),
      })
      setUnlockModalExam(null)
      showToast('Exam unlocked and logged to audit trail.')
      loadSectionData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unlock requires a valid reason.')
    }
  }

  const guardianActiveInvoices = useMemo(() => {
    if (role !== 'guardian') return invoicesData
    if (!activeChild?.id) return invoicesData
    const childFiltered = invoicesData.filter((inv) => inv.studentId === activeChild.id || inv.learner === activeChild.name)
    return childFiltered.length > 0 ? childFiltered : invoicesData
  }, [role, invoicesData, activeChild])

  const guardianChildResult = useMemo(() => {
    if (role !== 'guardian') return null
    return resultsData.find((r) => r.studentId === activeChild?.id || r.name === activeChild?.name) || resultsData[0] || null
  }, [role, resultsData, activeChild])

  const guardianChildAtt = useMemo(() => {
    if (role !== 'guardian') return null
    return (
      guardianAttendanceChildren.find((c) => c.id === activeChild?.id || c.name === activeChild?.name) ||
      guardianAttendanceChildren[0] ||
      null
    )
  }, [role, guardianAttendanceChildren, activeChild])

  return (
    <div className="role-data-content">
      <section className="data-controls">
        <label className="data-search">
          <Search size={16} />
          <input
            aria-label={`Search ${title}`}
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="filter-chip-row">
          {(isFeePage
            ? ['All', 'Unpaid', 'Partial', 'Paid']
            : section === 'reports'
              ? ['student', 'attendance', 'academic-performance', 'exam', 'fee-collection', 'outstanding-fees']
              : ['All', 'Active', 'Grade 10', 'Review']
          ).map((item) => (
            <button
              key={item}
              onClick={() => (section === 'reports' ? setReportType(item) : setFilter(item))}
              className={
                (section === 'reports' ? reportType === item : filter === item)
                  ? 'filter-chip filter-chip-active'
                  : 'filter-chip'
              }
            >
              {item}
              {item === 'Unpaid' && <span>{feeSummary.unpaidCount}</span>}
            </button>
          ))}
        </div>
        <button
          className="clear-filters"
          onClick={() => {
            setFilter('All')
            setSearch('')
          }}
        >
          <X size={13} /> Clear filters
        </button>
        {section !== 'audit-logs' && (
          <button className="data-action" onClick={action}>
            <Plus size={15} /> {pageAction}
          </button>
        )}
      </section>

      {isAttendancePage && role === 'teacher' && (
        <section className="attendance-tool-panel">
          <div className="attendance-tool-heading">
            <span className="attendance-date-chip">
              <CalendarCheck2 size={17} />
            </span>
            <div>
              <strong>
                {sectionsData.find((s) => s.id === activeAttendanceSectionId)?.label || 'Grade 10 · Section A'}
              </strong>
              <small>Biology · Today’s live attendance</small>
            </div>
            {sectionsData.length > 1 && (
              <select
                aria-label="Select assigned section"
                value={activeAttendanceSectionId}
                onChange={(e) => setActiveAttendanceSectionId(e.target.value)}
                style={{ height: 28, border: '1px solid #d8e9df', borderRadius: 5, fontSize: 9, padding: '0 8px' }}
              >
                {sectionsData.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            <div className="unsaved-indicator">
              <i />
              {Object.keys(attendance).length ? 'Ready to submit' : 'All changes saved'}
            </div>
          </div>
          <div className="attendance-live-summary">
            <span>
              Present <strong>{Object.values(attendance).filter((item) => item === 'Present').length}</strong>
            </span>
            <span>
              Absent <strong>{Object.values(attendance).filter((item) => item === 'Absent').length}</strong>
            </span>
            <span>
              Late <strong>{Object.values(attendance).filter((item) => item === 'Late').length}</strong>
            </span>
            <button onClick={() => setAttendance(Object.fromEntries(studentsData.map((student) => [student.id, 'Present'])))}>
              <CheckCheck size={15} /> Mark all present
            </button>
          </div>
          <div className="attendance-roster">
            {studentsData.map((student, index) => (
              <div className="attendance-student" key={student.id}>
                <span className="roster-index">{String(index + 1).padStart(2, '0')}</span>
                <Avatar>
                  <AvatarFallback>{student.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <strong>{student.name}</strong>
                  <small>
                    {student.id} · {student.grade}
                  </small>
                </div>
                <div className="attendance-toggle-group">
                  {['Present', 'Absent', 'Late'].map((status) => (
                    <button
                      key={status}
                      className={attendance[student.id] === status ? `toggle-${status.toLowerCase()} is-selected` : ''}
                      onClick={() => setAttendance((current) => ({ ...current, [student.id]: status }))}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="attendance-footer">
            <span>
              <kbd>P</kbd> Present <kbd>A</kbd> Absent <kbd>L</kbd> Late
            </span>
            <button disabled={!Object.keys(attendance).length} onClick={saveAttendance}>
              Submit attendance <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}

      {isAttendancePage && role === 'guardian' && guardianChildAtt && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>
                {guardianChildAtt.name} · Attendance History ({guardianChildAtt.percentage})
              </CardTitle>
              <p>
                Present: {guardianChildAtt.presentCount} days · Late: {guardianChildAtt.lateCount} days · Absent:{' '}
                {guardianChildAtt.absentCount} days
              </p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>DATE</span>
                <span>STUDENT</span>
                <span>GRADE</span>
                <span>SESSION</span>
                <span>STATUS</span>
                <span />
              </div>
              {guardianChildAtt.records.map((rec) => (
                <div className="records-row" key={rec.id}>
                  <span>•</span>
                  <span>
                    <strong>{rec.date}</strong>
                  </span>
                  <span>{guardianChildAtt.name}</span>
                  <span>{guardianChildAtt.grade}</span>
                  <span>DAILY</span>
                  <span>
                    <Badge className={rec.status === 'Present' ? 'record-status-active' : 'record-status-review'}>
                      <span />
                      {rec.status}
                    </Badge>
                  </span>
                  <span />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAttendancePage && role === 'admin' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>School-wide Attendance Log</CardTitle>
              <p>Showing latest daily attendance records across all sections</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>STUDENT</span>
                <span>GRADE</span>
                <span>DATE</span>
                <span>STATUS</span>
                <span>MARKED BY</span>
                <span />
              </div>
              {adminAttendanceRows
                .filter((r) => !search || `${r.studentName} ${r.studentId} ${r.grade}`.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 40)
                .map((r) => (
                  <div className="records-row" key={r.id}>
                    <span>•</span>
                    <span>
                      <strong>{r.studentName}</strong>
                      <small>{r.studentId}</small>
                    </span>
                    <span>{r.grade}</span>
                    <span>{r.date}</span>
                    <span>
                      <Badge className={r.status === 'Present' ? 'record-status-active' : 'record-status-review'}>
                        <span />
                        {r.status}
                      </Badge>
                    </span>
                    <span>{r.markedBy}</span>
                    <span />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isMarksPage && (
        <section className="marks-panel">
          <div className="marks-heading">
            <div>
              <strong>{activeMarksSubjectName} · Assessment Marks Entry</strong>
              <small>Assigned Grade 10 · Section A · Maximum score: 100 · Passing: 40</small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>
                Class average{' '}
                <strong>
                  {(
                    Object.values(marks).reduce((sum, value) => sum + (Number(value) || 0), 0) /
                    Math.max(1, Object.values(marks).filter((v) => v !== '').length)
                  ).toFixed(1)}
                </strong>
              </span>
              <button
                onClick={() => saveMarksToDb('SUBMITTED')}
                style={{
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 5,
                  background: '#278875',
                  color: 'white',
                  fontSize: 8,
                  fontWeight: 600,
                }}
              >
                Submit for publish
              </button>
            </div>
          </div>
          <div className="marks-table-head">
            <span>STUDENT</span>
            <span>STUDENT ID</span>
            <span>MARK / 100</span>
            <span>STATUS</span>
          </div>
          {studentsData.map((student) => (
            <div className="marks-row" key={student.id}>
              <strong>{student.name}</strong>
              <span>{student.id}</span>
              <input
                aria-label={`${student.name} mark out of 100`}
                value={marks[student.id] ?? ''}
                placeholder="—"
                type="number"
                max={100}
                min={0}
                className={Number(marks[student.id]) > 100 || Number(marks[student.id]) < 0 ? 'mark-invalid' : ''}
                onChange={(event) => setMarks((current) => ({ ...current, [student.id]: event.target.value }))}
              />
              <span>
                {Number(marks[student.id]) > 100 || Number(marks[student.id]) < 0 ? (
                  <i className="mark-error">Invalid (must be 0–100)</i>
                ) : marks[student.id] ? (
                  'Ready to save'
                ) : (
                  'Not entered'
                )}
              </span>
            </div>
          ))}
        </section>
      )}

      {isFeePage && role !== 'guardian' && (
        <>
          <div className="fee-summary-cards">
            <Card>
              <CardContent>
                <small>Total invoiced</small>
                <strong>{feeSummary.totalInvoiced}</strong>
                <span>Current school term</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <small>Collected</small>
                <strong>{feeSummary.totalCollected}</strong>
                <span>{feeSummary.collectionRatePct}% of total invoiced</span>
              </CardContent>
            </Card>
            <Card className="fee-unpaid-card">
              <CardContent>
                <small>Outstanding</small>
                <strong>{feeSummary.totalOutstanding}</strong>
                <span>{feeSummary.unpaidCount} invoices need attention</span>
              </CardContent>
            </Card>
          </div>
          <div className="invoice-banner">
            <Wallet size={18} />
            <div>
              <strong>{feeSummary.unpaidCount} unpaid or partial invoices</strong>
              <span>Review balances and record payments as they arrive.</span>
            </div>
            <button onClick={() => setFilter('Unpaid')}>
              View unpaid <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}

      {isFeePage && role === 'guardian' && (
        <div className="guardian-fee-banner">
          <div>
            <span>
              <Wallet size={17} /> OUTSTANDING BALANCE
            </span>
            <strong>{feeSummary.totalOutstandingFixed}</strong>
            <p>{activeChild?.name || 'Family'}’s Term 2 tuition & activity ledger</p>
          </div>
          <button onClick={action}>
            Pay fees <ArrowRight size={15} />
          </button>
        </div>
      )}

      {isExamPage && (
        <section className="exam-summary-strip">
          <div>
            <span>TOTAL EXAMS</span>
            <strong>
              {examsData.length} <small>assessments</small>
            </strong>
          </div>
          <div>
            <span>PUBLISHED</span>
            <strong>{examsData.filter((e) => e.status === 'PUBLISHED').length}</strong>
          </div>
          <div>
            <span>NEXT EXAM</span>
            <strong>
              Dec 08 <small>Semester 1 finals</small>
            </strong>
          </div>
        </section>
      )}

      {section === 'results' && role === 'guardian' && guardianChildResult && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>
                {guardianChildResult.name} ({guardianChildResult.studentId}) · Report Card
              </CardTitle>
              <p>
                Overall: {guardianChildResult.totalObtained} / {guardianChildResult.totalMax} (
                {guardianChildResult.overallPercentage}%) · Grade: {guardianChildResult.overallGrade} · Result:{' '}
                {guardianChildResult.passFail}
              </p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>SUBJECT</span>
                <span>EXAMINATION</span>
                <span>MARKS</span>
                <span>PERCENTAGE</span>
                <span>GRADE</span>
                <span>STATUS</span>
              </div>
              {guardianChildResult.subjects.map((sub, idx) => (
                <div className="records-row" key={`${sub.subjectName}-${idx}`}>
                  <span>•</span>
                  <span>
                    <strong>{sub.subjectName}</strong>
                  </span>
                  <span>{sub.examName}</span>
                  <span>
                    {sub.marksObtained} / {sub.maxMarks}
                  </span>
                  <span>{sub.percentage}%</span>
                  <span>
                    <strong>{sub.grade}</strong>
                  </span>
                  <span>
                    <Badge className={sub.passed ? 'record-status-active' : 'record-status-review'}>
                      <span />
                      {sub.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'guardians' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>Guardian & Family Directory</CardTitle>
              <p>Guardians and their linked children across the school</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>GUARDIAN</span>
                <span>CODE</span>
                <span>PHONE</span>
                <span>LINKED CHILDREN</span>
                <span>EMAIL</span>
                <span>STATUS</span>
              </div>
              {guardiansData
                .filter((g) => !search || `${g.name} ${g.email} ${g.id}`.toLowerCase().includes(search.toLowerCase()))
                .map((g) => (
                  <div className="records-row" key={g.id}>
                    <span>•</span>
                    <span>
                      <strong>{g.name}</strong>
                    </span>
                    <span>{g.id}</span>
                    <span>{g.phone}</span>
                    <span>{g.children.map((c) => `${c.name} (${c.grade})`).join(', ') || 'None'}</span>
                    <span>{g.email}</span>
                    <span>
                      <Badge className="record-status-active">
                        <span />
                        {g.status}
                      </Badge>
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'teachers' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>Teaching Staff Directory</CardTitle>
              <p>Manage faculty profiles, departments, and teaching loads</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>TEACHER</span>
                <span>DEPARTMENT</span>
                <span>QUALIFICATION</span>
                <span>ASSIGNMENTS</span>
                <span>EMAIL</span>
                <span>STATUS</span>
              </div>
              {teachersData
                .filter((t) => !search || `${t.name} ${t.department} ${t.email}`.toLowerCase().includes(search.toLowerCase()))
                .map((t) => (
                  <div className="records-row" key={t.id}>
                    <span>•</span>
                    <span>
                      <strong>{t.name}</strong>
                      <small>{t.id}</small>
                    </span>
                    <span>{t.department}</span>
                    <span>{t.qualification}</span>
                    <span>{t.assignmentCount} sections</span>
                    <span>{t.email}</span>
                    <span>
                      <Badge className="record-status-active">
                        <span />
                        {t.status}
                      </Badge>
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'classes' && role === 'admin' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>Classes & Sections</CardTitle>
              <p>Each section belongs to one class and tracks enrolled students</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>CLASS & SECTION</span>
                <span>ROOM</span>
                <span>ENROLLED</span>
                <span>CAPACITY</span>
                <span>ASSIGNED SUBJECTS</span>
                <span />
              </div>
              {sectionsData
                .filter((s) => !search || s.label.toLowerCase().includes(search.toLowerCase()))
                .map((sec) => (
                  <div className="records-row" key={sec.id}>
                    <span>•</span>
                    <span>
                      <strong>{sec.label}</strong>
                    </span>
                    <span>{sec.room}</span>
                    <span>{sec.studentCount} students</span>
                    <span>{sec.capacity} max</span>
                    <span>{sec.subjects.slice(0, 3).join(', ') || 'All core subjects'}</span>
                    <span />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'subjects' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>Academic Subject Catalog</CardTitle>
              <p>Curriculum subjects, default maximum marks, and class mappings</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>SUBJECT</span>
                <span>CODE</span>
                <span>DEPARTMENT</span>
                <span>MAX / PASS MARKS</span>
                <span>MAPPED CLASSES</span>
                <span />
              </div>
              {subjectsData
                .filter((s) => !search || `${s.name} ${s.code} ${s.department}`.toLowerCase().includes(search.toLowerCase()))
                .map((sub) => (
                  <div className="records-row" key={sub.id}>
                    <span>•</span>
                    <span>
                      <strong>{sub.name}</strong>
                    </span>
                    <span>{sub.code}</span>
                    <span>{sub.department}</span>
                    <span>
                      {sub.maxMarksDefault} / {sub.passingMarksDefault}
                    </span>
                    <span>{sub.classes.join(', ')}</span>
                    <span />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'assignments' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>Teacher Assignments</CardTitle>
              <p>Controls which sections and subjects each teacher can access</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>TEACHER</span>
                <span>CLASS & SECTION</span>
                <span>SUBJECT</span>
                <span>SCHEDULE</span>
                <span>ROOM</span>
                <span />
              </div>
              {assignmentsData
                .filter(
                  (a) =>
                    !search ||
                    `${a.teacherName} ${a.grade} ${a.subjectName}`.toLowerCase().includes(search.toLowerCase()),
                )
                .map((a) => (
                  <div className="records-row" key={a.id}>
                    <span>•</span>
                    <span>
                      <strong>{a.teacherName}</strong>
                      <small>{a.teacherCode}</small>
                    </span>
                    <span>{a.grade}</span>
                    <span>{a.subjectName}</span>
                    <span>{a.scheduleTime}</span>
                    <span>{a.scheduleRoom}</span>
                    <span />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'reports' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>{studentTableTitle}</CardTitle>
              <p>Live report generated from PostgreSQL · Click Export CSV report above to download</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              {reportsData.length > 0 && (
                <div className="records-header">
                  <span>•</span>
                  {Object.keys(reportsData[0])
                    .slice(0, 6)
                    .map((k) => (
                      <span key={k}>{k.toUpperCase()}</span>
                    ))}
                </div>
              )}
              {reportsData.slice(0, 40).map((row, idx) => (
                <div className="records-row" key={idx}>
                  <span>•</span>
                  {Object.values(row)
                    .slice(0, 6)
                    .map((v, i) => (
                      <span key={i}>{String(v)}</span>
                    ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'audit-logs' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>Append-Only System Audit Trail</CardTitle>
              <p>Every state-changing operation across Admin, Teacher, and Guardian roles</p>
            </div>
          </CardHeader>
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>•</span>
                <span>ACTOR</span>
                <span>ROLE</span>
                <span>ACTION</span>
                <span>ENTITY</span>
                <span>SUMMARY</span>
                <span>TIME</span>
              </div>
              {auditLogsData
                .filter(
                  (l) =>
                    !search ||
                    `${l.actorName} ${l.action} ${l.entityId} ${l.afterSummary || ''}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((log) => (
                  <div className="records-row" key={log.id}>
                    <span>•</span>
                    <span>
                      <strong>{log.actorName}</strong>
                    </span>
                    <span>
                      <Badge className="exam-status">{log.actorRole}</Badge>
                    </span>
                    <span>{log.action}</span>
                    <span>
                      {log.entityType} · {log.entityId}
                    </span>
                    <span>{log.afterSummary || '—'}</span>
                    <span>{log.timestamp}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'settings' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>School Workspace Settings</CardTitle>
              <p>Update academic year, active term, and school contact details</p>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 18 }}>
            <div className="payment-form" style={{ maxWidth: 460 }}>
              <label>
                School name
                <Input
                  value={schoolSettings.schoolName}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, schoolName: e.target.value })}
                />
              </label>
              <label>
                City & State
                <Input
                  value={schoolSettings.city}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, city: e.target.value })}
                />
              </label>
              <label>
                Academic Year
                <Input
                  value={schoolSettings.academicYear}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, academicYear: e.target.value })}
                />
              </label>
              <label>
                Current Term
                <Input
                  value={schoolSettings.currentTerm}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, currentTerm: e.target.value })}
                />
              </label>
              <button
                onClick={async () => {
                  try {
                    await apiJson('/api/settings', {
                      method: 'PATCH',
                      body: JSON.stringify(schoolSettings),
                    })
                    showToast('School settings saved to database.')
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Failed to save settings.')
                  }
                }}
              >
                Save settings <Check size={15} />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'profile' && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>My Account Profile</CardTitle>
              <p>Manage your contact details (Role is enforced by the school administrator)</p>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 18 }}>
            <div className="payment-form" style={{ maxWidth: 460 }}>
              <label>
                Full name
                <Input
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </label>
              <label>
                Email address (Read-only)
                <Input value={profileData.email} readOnly />
              </label>
              <label>
                Assigned Role (Read-only)
                <Input value={profileData.role.toUpperCase()} readOnly />
              </label>
              <label>
                Phone number
                <Input
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </label>
              <button
                onClick={async () => {
                  try {
                    await apiJson('/api/profile', {
                      method: 'PATCH',
                      body: JSON.stringify({ name: profileData.name, phone: profileData.phone }),
                    })
                    showToast('Profile updated successfully.')
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Could not update profile.')
                  }
                }}
              >
                Update profile <Check size={15} />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {(section === 'students' ||
        (section === 'classes' && role === 'teacher') ||
        section === 'performance' ||
        (section === 'results' && role !== 'guardian') ||
        isFeePage ||
        isExamPage) && (
        <Card className="records-card">
          <CardHeader>
            <div>
              <CardTitle>
                {isFeePage
                  ? role === 'guardian'
                    ? 'Family fee history'
                    : 'Invoice management'
                  : isExamPage
                    ? 'Assessment schedule'
                    : studentTableTitle}
              </CardTitle>
              <p>
                {isFeePage
                  ? role === 'guardian'
                    ? 'Your linked children’s fees only'
                    : 'View, filter, and record fee payments'
                  : isExamPage
                    ? 'Upcoming exams, submission progress, and result publishing'
                    : role === 'guardian'
                      ? 'Showing information for your linked children only'
                      : role === 'teacher'
                        ? 'Showing only students in your assigned classes'
                        : 'Manage records with quick filters and bulk actions'}
              </p>
            </div>
            <details className="column-menu">
              <summary>
                <span>Columns</span>
                <ChevronDown size={13} />
              </summary>
              <label>
                <input type="checkbox" checked={showEmail} onChange={(event) => setShowEmail(event.target.checked)} /> Show
                email / details
              </label>
            </details>
          </CardHeader>
          {selected.length > 0 && (
            <div className="bulk-action-bar">
              <span>{selected.length} selected</span>
              <button onClick={exportCsv}>
                <Download size={14} /> Export selected
              </button>
              <button onClick={() => setSelected([])}>
                <X size={14} /> Clear selection
              </button>
            </div>
          )}
          <CardContent className="records-table-wrap">
            <div className="records-table">
              <div className="records-header">
                <span>
                  <input
                    aria-label="Select all records"
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selected.length === filteredStudents.length}
                    onChange={(event) =>
                      setSelected(event.target.checked ? filteredStudents.map((item) => item.id) : [])
                    }
                  />
                </span>
                {(isFeePage
                  ? ['Invoice', 'Student', 'Due Date', 'Total', 'Balance']
                  : isExamPage
                    ? ['Examination', 'Grades', 'Dates', 'Progress', 'Status']
                    : studentColumns.filter((column) => !(column === 'Program' && role !== 'admin' && section !== 'results'))
                ).map((column) => (
                  <span key={column}>{column}</span>
                ))}
                {showEmail && !isExamPage && <span>{isFeePage ? 'Status' : 'Email'}</span>}
                <span />
              </div>
              {(isFeePage
                ? guardianActiveInvoices.filter(
                    (invoice) =>
                      (filter === 'All' ||
                        (filter === 'Unpaid' ? invoice.status !== 'Paid' : invoice.status === filter)) &&
                      (!search ||
                        `${invoice.id} ${invoice.learner} ${invoice.description}`
                          .toLowerCase()
                          .includes(search.toLowerCase())),
                  )
                : isExamPage
                  ? examsData.filter(
                      (row) =>
                        (filter === 'All' || (row.state === 'In progress' && filter === 'Active')) &&
                        (!search || row.name.toLowerCase().includes(search.toLowerCase())),
                    )
                  : filteredStudents
              ).map((record) =>
                isFeePage ? (
                  <div className="records-row" key={(record as InvoiceRecord).id}>
                    <span>
                      <input
                        aria-label={`Select invoice ${(record as InvoiceRecord).id}`}
                        type="checkbox"
                        checked={selected.includes((record as InvoiceRecord).id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes((record as InvoiceRecord).id)
                              ? current.filter((id) => id !== (record as InvoiceRecord).id)
                              : [...current, (record as InvoiceRecord).id],
                          )
                        }
                      />
                    </span>
                    <span>
                      <strong>{(record as InvoiceRecord).id}</strong>
                      <small>
                        {(record as InvoiceRecord).family} · {(record as InvoiceRecord).description}
                      </small>
                    </span>
                    <span>{(record as InvoiceRecord).learner}</span>
                    <span>{(record as InvoiceRecord).due}</span>
                    <span>{(record as InvoiceRecord).amount}</span>
                    <span>{(record as InvoiceRecord).outstandingAmount || '$0.00'}</span>
                    {showEmail && (
                      <span>
                        <Badge
                          className={
                            (record as InvoiceRecord).status === 'Paid'
                              ? 'record-status-active'
                              : 'record-status-review'
                          }
                        >
                          <span />
                          {(record as InvoiceRecord).status}
                        </Badge>
                      </span>
                    )}
                    <span>
                      <button
                        className="row-payment-button"
                        onClick={() => {
                          const inv = record as InvoiceRecord
                          setPayment(inv)
                          setPaymentAmountInput(
                            inv.status === 'Paid' ? '0.00' : (inv.outstandingAmount || inv.amount).replace(/[$,]/g, ''),
                          )
                        }}
                      >
                        {(record as InvoiceRecord).status === 'Paid'
                          ? 'View'
                          : role === 'guardian'
                            ? 'Pay now'
                            : 'Record payment'}
                      </button>
                    </span>
                  </div>
                ) : isExamPage ? (
                  <div className="records-row" key={(record as ExamRow).id}>
                    <span>•</span>
                    <span>
                      <strong>{(record as ExamRow).name}</strong>
                    </span>
                    <span>{(record as ExamRow).grade}</span>
                    <span>{(record as ExamRow).date}</span>
                    <span>{(record as ExamRow).completed}</span>
                    <span>
                      <Badge className="exam-status">{(record as ExamRow).state}</Badge>
                    </span>
                    <span>
                      {role === 'admin' && (
                        <button
                          className="row-payment-button"
                          onClick={() =>
                            handleExamStatusAction(
                              record as ExamRow,
                              (record as ExamRow).status === 'PUBLISHED' ? 'UNLOCK' : 'PUBLISH',
                            )
                          }
                        >
                          {(record as ExamRow).status === 'PUBLISHED' ? 'Unlock' : 'Publish results'}
                        </button>
                      )}
                    </span>
                  </div>
                ) : (
                  <StudentTableRow
                    key={(record as StudentRecord).id}
                    student={record as StudentRecord}
                    columns={studentColumns.filter(
                      (column) => !(column === 'Program' && role !== 'admin' && section !== 'results'),
                    )}
                    showEmail={showEmail}
                    selected={selected.includes((record as StudentRecord).id)}
                    onSelect={() =>
                      setSelected((current) =>
                        current.includes((record as StudentRecord).id)
                          ? current.filter((id) => id !== (record as StudentRecord).id)
                          : [...current, (record as StudentRecord).id],
                      )
                    }
                  />
                ),
              )}
              {!filteredStudents.length && !isFeePage && !isExamPage && (
                <div className="records-empty">
                  <Search size={20} />
                  <strong>No matches found</strong>
                  <span>Try clearing a filter or changing your search.</span>
                  <button
                    onClick={() => {
                      setFilter('All')
                      setSearch('')
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!payment} onOpenChange={(open) => !open && setPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{payment?.status === 'Paid' ? 'Invoice Receipt' : 'Record a payment'}</DialogTitle>
            <DialogDescription>
              {payment?.id} · {payment?.learner} · {payment?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="payment-form">
            <label>
              Total invoice amount
              <Input aria-label="Total invoice amount" value={payment?.amount || ''} readOnly />
            </label>
            <label>
              Outstanding balance
              <Input
                aria-label="Outstanding balance"
                value={payment?.status === 'Paid' ? '$0.00' : payment?.outstandingAmount || payment?.amount || ''}
                readOnly
              />
            </label>
            {payment?.status !== 'Paid' && (
              <>
                <label>
                  Payment amount ($)
                  <Input
                    aria-label="Payment amount"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                  />
                </label>
                <label>
                  Payment method
                  <select
                    aria-label="Payment method"
                    value={paymentMethodInput}
                    onChange={(e) => setPaymentMethodInput(e.target.value)}
                  >
                    <option>Bank transfer</option>
                    <option>Cash</option>
                    <option>Card payment</option>
                  </select>
                </label>
                <button onClick={handleConfirmPayment}>
                  Confirm payment <Check size={15} />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pageAction}</DialogTitle>
            <DialogDescription>Create a new record in the school PostgreSQL database.</DialogDescription>
          </DialogHeader>
          <div className="payment-form">
            <label>
              {section === 'subjects'
                ? 'Subject Code (e.g. CHM-101)'
                : section === 'assignments'
                  ? 'Teacher Code (e.g. TCH-1001)'
                  : isFeePage
                    ? 'Student ID (e.g. STU-24018)'
                    : 'Name / Title'}
              <Input value={formField1} onChange={(e) => setFormField1(e.target.value)} placeholder="Enter value" />
            </label>
            <label>
              {section === 'classes'
                ? 'Grade Level (9, 10, 11)'
                : section === 'subjects'
                  ? 'Subject Name'
                  : section === 'assignments'
                    ? 'Section ID'
                    : isFeePage
                      ? 'Fee Description'
                      : isExamPage
                        ? 'Academic Term'
                        : 'Email Address'}
              <Input value={formField2} onChange={(e) => setFormField2(e.target.value)} placeholder="Enter value" />
            </label>
            {section === 'students' && sectionsData.length > 0 ? (
              <label>
                Class & Section
                <select value={formField3} onChange={(e) => setFormField3(e.target.value)}>
                  {sectionsData.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                {section === 'classes'
                  ? 'Section Name (e.g. C)'
                  : section === 'teachers' || section === 'subjects'
                    ? 'Department'
                    : isFeePage
                      ? 'Amount ($)'
                      : isExamPage
                        ? 'Start Date (YYYY-MM-DD)'
                        : 'Phone / Detail'}
                <Input value={formField3} onChange={(e) => setFormField3(e.target.value)} placeholder="Enter value" />
              </label>
            )}
            <label>
              {section === 'students'
                ? 'Program (Science, Arts, Commerce)'
                : section === 'guardians'
                  ? 'Link Student Code (e.g. STU-24018)'
                  : section === 'classes'
                    ? 'Room (e.g. Room 205)'
                    : isFeePage
                      ? 'Due Date (YYYY-MM-DD)'
                      : isExamPage
                        ? 'End Date (YYYY-MM-DD)'
                        : 'Additional Info'}
              <Input value={formField4} onChange={(e) => setFormField4(e.target.value)} placeholder="Enter value" />
            </label>
            <button onClick={handleCreateSubmit}>
              Save to database <Check size={15} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unlockModalExam} onOpenChange={(open) => !open && setUnlockModalExam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Published Examination</DialogTitle>
            <DialogDescription>
              Provide a mandatory audit reason to unlock {unlockModalExam?.name} for marks editing.
            </DialogDescription>
          </DialogHeader>
          <div className="payment-form">
            <label>
              Reason for unlocking
              <Input
                value={unlockReasonInput}
                onChange={(e) => setUnlockReasonInput(e.target.value)}
                placeholder="e.g. Recalculation of lab question 4"
              />
            </label>
            <button onClick={confirmUnlockExam}>
              Confirm unlock <Check size={15} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div role="status" className="workspace-toast">
          <Check size={15} />
          {toast}
          <button onClick={() => setToast('')}>Dismiss</button>
        </div>
      )}
    </div>
  )
}

function StudentTableRow({
  student,
  columns,
  showEmail,
  selected,
  onSelect,
}: {
  student: StudentRecord & { email?: string }
  columns: string[]
  showEmail: boolean
  selected: boolean
  onSelect: () => void
}) {
  const values: Record<string, React.ReactNode> = {
    Student: (
      <div className="record-person">
        <Avatar>
          <AvatarFallback>{student.initials}</AvatarFallback>
        </Avatar>
        <span>
          <strong>{student.name}</strong>
          <small>{student.id}</small>
        </span>
      </div>
    ),
    Grade: student.grade,
    Program: student.program,
    Attendance: (
      <span className="record-attendance">
        <i style={{ width: student.attendance.includes('%') ? student.attendance : '100%' }} />
        {student.attendance}
      </span>
    ),
    Status: (
      <Badge className={student.status === 'Active' ? 'record-status-active' : 'record-status-review'}>
        <span />
        {student.status}
      </Badge>
    ),
  }
  return (
    <div className="records-row">
      <span>
        <input type="checkbox" aria-label={`Select ${student.name}`} checked={selected} onChange={onSelect} />
      </span>
      {columns.map((column) => (
        <span key={column}>{values[column]}</span>
      ))}
      {showEmail && <span>{student.email || `${student.name.toLowerCase().replaceAll(' ', '.')}@school.demo`}</span>}
      <span>
        <button className="row-more" aria-label={`Open ${student.name} actions`}>
          ···
        </button>
      </span>
    </div>
  )
}
