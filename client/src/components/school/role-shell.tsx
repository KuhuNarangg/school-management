'use client'

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Command,
  FileBarChart,
  FileClock,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Users,
  Wallet,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  adminNavigation,
  demoUsers,
  guardianChildren,
  guardianNavigation,
  schoolStudents,
  teacherNavigation,
  teacherStudents,
} from '@/lib/api/school'
import type { SchoolRole, SchoolSection, SchoolUser, StudentRecord } from '@/lib/types'

export const ActiveChildContext = createContext<StudentRecord>(guardianChildren[0])

const roleNames: Record<SchoolRole, string> = { admin: 'Administrator', teacher: 'Teacher', guardian: 'Guardian' }
const roleLanding: Record<SchoolRole, string> = { admin: '/admin/dashboard', teacher: '/teacher/today', guardian: '/guardian/home' }
const roleLinks: Record<SchoolRole, SchoolSection[]> = { admin: adminNavigation, teacher: teacherNavigation, guardian: guardianNavigation }

function iconFor(label: string) {
  if (label.includes('Overview') || label === 'Today' || label === 'Home') return LayoutDashboard
  if (label.includes('Student') || label.includes('Children')) return GraduationCap
  if (label.includes('Guardian')) return HeartHandshake
  if (label.includes('Teacher') || label.includes('Profile')) return Users
  if (label.includes('Class')) return BookOpen
  if (label.includes('Subject') || label.includes('Exam') || label.includes('Marks') || label.includes('Results')) return ClipboardCheck
  if (label.includes('Attendance')) return CalendarCheck2
  if (label.includes('Fee')) return Wallet
  if (label.includes('Report') || label.includes('Performance')) return FileBarChart
  if (label.includes('Audit')) return FileClock
  if (label.includes('Setting')) return Settings2
  return ListChecks
}

function routeTitle(pathname: string) {
  const section = pathname.split('/').filter(Boolean).at(-1) || 'dashboard'
  const link = [...adminNavigation, ...teacherNavigation, ...guardianNavigation].find((item) => item.href === pathname)
  return link?.label || section.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ')
}

export function RoleShell({ role, children }: { role: SchoolRole; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SchoolUser>(demoUsers[role])
  const [liveChildren, setLiveChildren] = useState<StudentRecord[]>(guardianChildren)
  const [liveRecords, setLiveRecords] = useState<StudentRecord[]>(
    role === 'admin' ? schoolStudents : role === 'teacher' ? teacherStudents : guardianChildren,
  )
  const links = roleLinks[role]
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher'
  const isGuardian = role === 'guardian'
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const [activeChild, setActiveChild] = useState<StudentRecord>(guardianChildren[0])
  const [notice, setNotice] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    async function loadSessionData() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (data.user) {
          setUser(data.user)
        }
        if (role === 'guardian' && Array.isArray(data.children) && data.children.length > 0) {
          setLiveChildren(data.children)
          setLiveRecords(data.children)
          setActiveChild((prev) => data.children.find((c: StudentRecord) => c.id === prev?.id) || data.children[0])
        } else if (role === 'teacher' && Array.isArray(data.assignedStudents)) {
          setLiveRecords(data.assignedStudents)
        } else if (role === 'admin') {
          const stRes = await fetch('/api/students?pageSize=50', { cache: 'no-store' })
          if (stRes.ok) {
            const stData = await stRes.json()
            if (active && Array.isArray(stData.students)) {
              setLiveRecords(stData.students)
            }
          }
        }
      } catch {
        // Fallback smoothly if offline
      }
    }
    loadSessionData()
    return () => {
      active = false
    }
  }, [role, pathname])

  const groupMap = useMemo(
    () =>
      links.reduce<Record<string, SchoolSection[]>>((groups, item) => {
        ;(groups[item.group] ||= []).push(item)
        return groups
      }, {}),
    [links],
  )
  const allowedRecords = liveRecords
  const matchingRoutes = links.filter((item) => item.label.toLowerCase().includes(paletteQuery.toLowerCase()))
  const matchingRecords = allowedRecords.filter((item) =>
    `${item.name} ${item.id} ${item.grade}`.toLowerCase().includes(paletteQuery.toLowerCase()),
  )
  const pageTitle = routeTitle(pathname)
  const pageDescription = isGuardian
    ? 'A clear, reassuring view of what matters for your family.'
    : isTeacher
      ? 'Your assigned classes, students, and daily teaching priorities.'
      : 'A clear view of the numbers, people, and priorities shaping your school day.'
  const allActions = isAdmin
    ? ['Add student', 'Add teacher', 'Create invoice', 'Record payment', 'Create exam', 'View reports']
    : isTeacher
      ? ['Mark attendance', 'Enter marks', 'My classes', 'Student performance']
      : ['View attendance', 'View results', 'Pay fees', 'Download report card']

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(`northstar:${role}:collapsed`) === 'true')
    setRecent(JSON.parse(window.localStorage.getItem(`northstar:${role}:recent`) || '[]'))
  }, [role])

  const navigate = useCallback(
    (href: string, label?: string) => {
      if (label) {
        const next = [label, ...recent.filter((entry) => entry !== label)].slice(0, 4)
        setRecent(next)
        window.localStorage.setItem(`northstar:${role}:recent`, JSON.stringify(next))
      }
      setPaletteOpen(false)
      setActionOpen(false)
      setMenuOpen(false)
      setPaletteQuery('')
      router.push(href)
    },
    [recent, role, router],
  )

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }, [])

  const triggerAction = useCallback(
    (action: string) => {
      if (action === 'View reports') return navigate('/admin/reports', action)
      if (action === 'Add student') return navigate('/admin/students', action)
      if (action === 'Add teacher') return navigate('/admin/teachers', action)
      if (action === 'Create invoice' || action === 'Record payment') return navigate('/admin/fees', action)
      if (action === 'Create exam') return navigate('/admin/examinations', action)
      if (action === 'My classes') return navigate('/teacher/classes', action)
      if (action === 'Student performance') return navigate('/teacher/performance', action)
      if (action === 'Mark attendance') return navigate(isGuardian ? '/guardian/attendance' : `/${role}/attendance`, action)
      if (action === 'Enter marks') return navigate('/teacher/marks', action)
      if (action === 'View attendance') return navigate('/guardian/attendance', action)
      if (action === 'View results') return navigate('/guardian/results', action)
      if (action === 'Pay fees') return navigate('/guardian/fees', action)
      if (action === 'Download report card') return showNotice('Your latest report card is ready to download.')
      setActionOpen(true)
    },
    [isGuardian, navigate, role, showNotice],
  )

  useEffect(() => {
    let sequenceTimer: ReturnType<typeof setTimeout> | undefined
    let waitingForRouteKey = false
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isTyping = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (isTyping) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (event.key === '?') {
        event.preventDefault()
        setHelpOpen(true)
        return
      }
      if (event.key === '/') {
        event.preventDefault()
        const pageSearch = document.querySelector<HTMLInputElement>('.data-search input')
        if (pageSearch) pageSearch.focus()
        else setPaletteOpen(true)
        return
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setActionOpen(true)
        return
      }
      if (waitingForRouteKey) {
        const routes: Record<string, string> = {
          d: roleLanding[role],
          s: role === 'guardian' ? '/guardian/results' : role === 'teacher' ? '/teacher/classes' : '/admin/students',
          a: `/${role}/attendance`,
          e: role === 'guardian' ? '/guardian/results' : `/${role}/examinations`,
          f: role === 'guardian' ? '/guardian/fees' : '/admin/fees',
        }
        const destination = routes[event.key.toLowerCase()]
        if (destination) {
          event.preventDefault()
          navigate(destination)
        }
        waitingForRouteKey = false
        return
      }
      if (event.key.toLowerCase() === 'g') {
        waitingForRouteKey = true
        sequenceTimer = setTimeout(() => {
          waitingForRouteKey = false
        }, 900)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (sequenceTimer) clearTimeout(sequenceTimer)
    }
  }, [navigate, role])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    window.localStorage.setItem(`northstar:${role}:collapsed`, String(next))
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.assign('/')
  }

  const navButton = (item: SchoolSection, compact = false) => {
    const Icon = iconFor(item.label)
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    return (
      <Link
        aria-label={item.label}
        title={compact ? `${item.label}${item.shortcut ? ` · G then ${item.shortcut}` : ''}` : undefined}
        key={item.href}
        href={item.href}
        onClick={() => navigate(item.href, item.label)}
        className={`role-nav-link ${active ? 'role-nav-active' : ''} ${compact ? 'role-nav-compact' : ''}`}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span>{item.label}</span>
        {item.count && <Badge className="role-nav-count">{item.count}</Badge>}
        {item.shortcut && !compact && <kbd>G {item.shortcut}</kbd>}
      </Link>
    )
  }

  const roleBadge = <Badge className={`role-badge role-badge-${role}`}>{roleNames[role]}</Badge>
  return (
    <div className={`role-app role-app-${role} ${collapsed && isAdmin ? 'role-app-collapsed' : ''}`}>
      {isAdmin && (
        <aside className={`role-sidebar ${collapsed ? 'is-collapsed' : ''} ${menuOpen ? 'is-open' : ''}`}>
          <Link href="/" className="role-brand">
            <span className="role-brand-icon">
              <GraduationCap size={20} />
            </span>
            {!collapsed && (
              <span>
                northstar<span>.</span>
              </span>
            )}
          </Link>
          <div className="role-school">
            <span>N</span>
            {!collapsed && (
              <div>
                <strong>Northstar Academy</strong>
                <small>Springfield, IL</small>
              </div>
            )}
            <ChevronDown size={14} />
          </div>
          <nav className="role-nav" aria-label="Administrator navigation">
            {Object.entries(groupMap).map(([group, entries]) => (
              <div className="role-nav-group" key={group}>
                <span className="role-group-label">{!collapsed && group}</span>
                {entries.map((item) => navButton(item, collapsed))}
              </div>
            ))}
          </nav>
          <div className="role-sidebar-bottom">
            <button
              className="sidebar-collapse"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronRight className={collapsed ? '' : 'chevron-flipped'} size={16} />
              {!collapsed && 'Collapse menu'}
            </button>
            {profileMenu(user, roleBadge, logout, collapsed)}
          </div>
        </aside>
      )}
      {isTeacher && (
        <aside className={`teacher-rail ${menuOpen ? 'is-open' : ''}`}>
          <Link href="/teacher/today" className="teacher-rail-brand" aria-label="Northstar Teacher workspace">
            <GraduationCap size={21} />
          </Link>
          <nav aria-label="Teacher navigation">
            {links.map((item) => {
              const Icon = iconFor(item.label)
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={active ? 'teacher-rail-link active' : 'teacher-rail-link'}
                  onClick={() => navigate(item.href, item.label)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {item.count && <i />}
                </Link>
              )
            })}
          </nav>
          <div className="teacher-rail-bottom">
            <button aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={() => setHelpOpen(true)}>
              <CircleHelp size={18} />
            </button>
            <button aria-label="Sign out" title="Sign out" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </aside>
      )}
      {isGuardian && (
        <header className="guardian-header">
          <Link href="/guardian/home" className="guardian-brand">
            <span className="guardian-brand-icon">
              <GraduationCap size={19} />
            </span>
            <span>
              northstar<span>.</span>
            </span>
          </Link>
          <div className="child-picker" aria-label="Choose a child">
            {liveChildren.map((child, index) => (
              <button
                key={child.id}
                aria-pressed={activeChild.id === child.id}
                className={activeChild.id === child.id ? 'child-chip child-chip-active' : 'child-chip'}
                onClick={() => {
                  setActiveChild(child)
                  showNotice(`${child.name} selected`)
                }}
              >
                <span className={`child-chip-avatar child-chip-${index}`}>{child.initials.slice(0, 1)}</span>
                <span>{child.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <div className="guardian-user">{profileMenu(user, roleBadge, logout, false)}</div>
        </header>
      )}
      {menuOpen && <button className="role-mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <div className={`role-main ${isAdmin ? 'role-main-admin' : ''} ${isTeacher ? 'role-main-teacher' : ''} ${isGuardian ? 'role-main-guardian' : ''}`}>
        {!isGuardian && (
          <header className="role-topbar">
            <button className="role-mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={20} />
            </button>
            <div className="role-breadcrumb">
              <Link href={roleLanding[role]}>{roleNames[role]}</Link>
              <ChevronRight size={14} />
              <span>{pageTitle}</span>
            </div>
            <div className="role-top-actions">
              <button className="role-search-trigger" onClick={() => setPaletteOpen(true)}>
                <Search size={16} />
                <span>Search anything</span>
                <kbd>⌘ K</kbd>
              </button>
              <button
                className="role-bell"
                aria-label="Notifications, 2 unread"
                onClick={() => showNotice('You’re all caught up on your notifications.')}
              >
                <Bell size={18} />
                <i>2</i>
              </button>
              {isAdmin && (
                <button className="role-add-global" onClick={() => setActionOpen(true)} aria-label="Quick actions">
                  <Plus size={17} />
                </button>
              )}
              <div className="role-top-divider" />
              {!isTeacher && profileMenu(user, roleBadge, logout, false)}
            </div>
          </header>
        )}
        {isGuardian && (
          <div className="guardian-mobile-title">
            <span>YOUR FAMILY</span>
            <h1>{pageTitle}</h1>
            <p>Good morning, {user.name.split(' ')[0]}</p>
          </div>
        )}
        {isTeacher && (
          <header className="teacher-mobile-header">
            <button aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
              <Menu size={19} />
            </button>
            <span>
              northstar<span>.</span>
            </span>
            <button aria-label="Search" onClick={() => setPaletteOpen(true)}>
              <Search size={18} />
            </button>
          </header>
        )}
        <main className={`role-page ${isGuardian ? 'guardian-content' : ''}`}>
          <div className="role-page-heading">
            <div>
              <div className="role-page-kicker">
                <button aria-label="Back" onClick={() => router.back()}>
                  <ArrowLeft size={14} />
                </button>
                {isAdmin ? 'SCHOOL MANAGEMENT' : isTeacher ? 'TEACHING WORKSPACE' : 'FAMILY PORTAL'} <span>·</span>{' '}
                {pageTitle.toUpperCase()}
              </div>
              <h1>{pageTitle}</h1>
              <p>{pageDescription}</p>
            </div>
            {!isGuardian && (
              <div className="role-page-actions">
                {isAdmin && (
                  <button
                    className="role-primary-button"
                    onClick={() => {
                      const dataBtn = document.querySelector<HTMLButtonElement>('button.data-action')
                      if (dataBtn) dataBtn.click()
                      else setActionOpen(true)
                    }}
                  >
                    <Plus size={15} />{' '}
                    {pageTitle === 'Overview'
                      ? 'Add student'
                      : pageTitle.includes('Fee')
                        ? 'Create invoice'
                        : `Add ${pageTitle.toLowerCase().replace(/s$/, '')}`}
                  </button>
                )}
                {isTeacher && (
                  <button className="teacher-primary-button" onClick={() => triggerAction('Mark attendance')}>
                    <ClipboardCheck size={15} /> Mark attendance
                  </button>
                )}
              </div>
            )}
          </div>
          <ActiveChildContext.Provider value={activeChild}>{children}</ActiveChildContext.Provider>
        </main>
        {!isGuardian && (
          <footer className="role-footer">
            <span>© 2026 Northstar Academy</span>
            <span>
              <i /> All systems operational
            </span>
            <button onClick={() => showNotice('Help center opened')}>
              Help & support <ArrowRight size={13} />
            </button>
          </footer>
        )}
      </div>
      {isGuardian && (
        <nav className="guardian-tabbar" aria-label="Family navigation">
          {links.map((item) => {
            const Icon = iconFor(item.label)
            const active = pathname === item.href
            return (
              <Link
                href={item.href}
                key={item.href}
                className={active ? 'guardian-tab active' : 'guardian-tab'}
                onClick={() => navigate(item.href, item.label)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
      <Dialog
        open={paletteOpen}
        onOpenChange={(open) => {
          setPaletteOpen(open)
          if (!open) setPaletteQuery('')
        }}
      >
        <DialogContent className="command-dialog">
          <DialogHeader>
            <DialogTitle>Jump to anything</DialogTitle>
            <DialogDescription>Search pages and records you can access. Press Escape to close.</DialogDescription>
          </DialogHeader>
          <div className="command-search">
            <Search size={17} />
            <Input
              ref={searchRef}
              autoFocus
              placeholder="Search pages, students, classes..."
              value={paletteQuery}
              onChange={(event) => {
                setPaletteQuery(event.target.value)
                setActiveCommandIndex(0)
              }}
              onKeyDown={(event) => {
                const total = matchingRoutes.length + matchingRecords.length
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActiveCommandIndex((index) => (index + 1) % Math.max(1, total))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActiveCommandIndex((index) => (index - 1 + Math.max(1, total)) % Math.max(1, total))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  if (activeCommandIndex < matchingRoutes.length) {
                    const item = matchingRoutes[activeCommandIndex]
                    if (item) navigate(item.href, item.label)
                  } else {
                    const student = matchingRecords[activeCommandIndex - matchingRoutes.length]
                    if (student)
                      navigate(
                        role === 'admin' ? '/admin/students' : role === 'teacher' ? '/teacher/classes' : '/guardian/results',
                        student.name,
                      )
                  }
                }
              }}
            />
          </div>
          <div className="command-results">
            <span className="command-section-label">PAGES</span>
            {matchingRoutes.map((item, index) => (
              <button
                className={activeCommandIndex === index ? 'command-item-active' : ''}
                key={item.href}
                onMouseEnter={() => setActiveCommandIndex(index)}
                onClick={() => navigate(item.href, item.label)}
              >
                <span className="command-result-icon">
                  <Command size={15} />
                </span>
                <span>{item.label}</span>
                {item.shortcut && <kbd>G {item.shortcut}</kbd>}
                <ArrowRight size={14} />
              </button>
            ))}
            {matchingRecords.length > 0 && (
              <>
                <span className="command-section-label">
                  {isGuardian ? 'YOUR CHILDREN' : isTeacher ? 'YOUR STUDENTS' : 'STUDENTS'}
                </span>
                {matchingRecords.slice(0, 5).map((student, index) => (
                  <button
                    className={activeCommandIndex === matchingRoutes.length + index ? 'command-item-active' : ''}
                    key={student.id}
                    onMouseEnter={() => setActiveCommandIndex(matchingRoutes.length + index)}
                    onClick={() =>
                      navigate(
                        role === 'admin' ? '/admin/students' : role === 'teacher' ? '/teacher/classes' : '/guardian/results',
                        student.name,
                      )
                    }
                  >
                    <span className="command-record-avatar">{student.initials}</span>
                    <span>
                      {student.name}
                      <small>
                        {student.grade} · {student.id}
                      </small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </>
            )}
            {!matchingRoutes.length && !matchingRecords.length && (
              <p className="command-empty">No pages or records found for “{paletteQuery}”.</p>
            )}
            {recent.length > 0 && !paletteQuery && (
              <>
                <span className="command-section-label">RECENTLY VIEWED</span>
                {recent.slice(0, 3).map((label) => (
                  <button
                    className="command-recent"
                    key={label}
                    onClick={() => navigate(links.find((item) => item.label === label)?.href || roleLanding[role], label)}
                  >
                    <ArrowLeft size={13} />
                    {label}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="command-hints">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> to navigate
            </span>
            <span>
              <kbd>↵</kbd> to open
            </span>
            <span>
              <kbd>esc</kbd> to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="quick-action-dialog">
          <DialogHeader>
            <DialogTitle>Quick actions</DialogTitle>
            <DialogDescription>Choose a shortcut for your {roleNames[role].toLowerCase()} workspace.</DialogDescription>
          </DialogHeader>
          <div className="quick-action-list">
            {allActions.map((action) => (
              <button
                key={action}
                onClick={() => {
                  setActionOpen(false)
                  triggerAction(action)
                }}
              >
                <span>
                  <Plus size={15} />
                </span>
                {action}
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="shortcut-dialog">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Quick ways to move through your {roleNames[role].toLowerCase()} workspace.</DialogDescription>
          </DialogHeader>
          <div className="shortcut-list">
            <p>
              <span>Open command palette</span>
              <kbd>⌘ K</kbd>
            </p>
            <p>
              <span>Go to dashboard</span>
              <kbd>G</kbd>
              <kbd>D</kbd>
            </p>
            <p>
              <span>Go to students / classes</span>
              <kbd>G</kbd>
              <kbd>S</kbd>
            </p>
            <p>
              <span>Go to attendance</span>
              <kbd>G</kbd>
              <kbd>A</kbd>
            </p>
            <p>
              <span>Go to exams / results</span>
              <kbd>G</kbd>
              <kbd>E</kbd>
            </p>
            <p>
              <span>Go to fees</span>
              <kbd>G</kbd>
              <kbd>F</kbd>
            </p>
            <p>
              <span>New quick action</span>
              <kbd>N</kbd>
            </p>
            <p>
              <span>Focus search</span>
              <kbd>/</kbd>
            </p>
            <p>
              <span>Show this help</span>
              <kbd>?</kbd>
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {notice && (
        <div role="status" className="role-toast">
          <Check size={16} />
          {notice}
          <button aria-label="Undo" onClick={() => setNotice('')}>
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

function profileMenu(user: SchoolUser, roleBadge: React.ReactNode, logout: () => void, compact: boolean) {
  return (
    <details className={`role-profile ${compact ? 'profile-compact' : ''}`}>
      <summary>
        <Avatar>
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        {!compact && (
          <span>
            <strong>{user.name}</strong>
            <small>{roleNames[user.role]}</small>
          </span>
        )}
        {!compact && <MoreHorizontal size={17} />}
      </summary>
      <div className="profile-popover">
        <div className="profile-popover-user">
          <strong>{user.name}</strong>
          {roleBadge}
          <small>{user.email}</small>
        </div>
        <button onClick={logout}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </details>
  )
}
