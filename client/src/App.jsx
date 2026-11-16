import React, { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useSearchParams,
  useNavigate,
} from 'react-router-dom'
import Link from './shims/next-link'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  HeartHandshake,
  LibraryBig,
  Lock,
  Menu,
  SearchX,
  ShieldCheck,
  ShieldX,
  Sparkles,
  UsersRound,
  Wallet,
  Zap,
} from 'lucide-react'
import { LoginForm } from './components/school/login-form'
import { RoleShell } from './components/school/role-shell'
import { RoleWorkspace } from './components/school/role-workspace'
import {
  adminNavigation,
  teacherNavigation,
  guardianNavigation,
} from './lib/api/school'
import { readCookie } from './api-client'

function roleHomePath(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'teacher') return '/teacher/today'
  return '/guardian/home'
}

function RoleRouteGuard({ requiredRole, children }) {
  const navigate = useNavigate()
  const isCrossOrigin = Boolean(import.meta.env?.VITE_API_URL)
  const cookieRole =
    readCookie('school-demo-role') ||
    (isCrossOrigin ? localStorage.getItem('northstar_role') : null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          document.cookie = 'school-demo-role=; Path=/; Max-Age=0'
          document.cookie = 'northstar-csrf=; Path=/; Max-Age=0'
          localStorage.removeItem('northstar_session_token')
          localStorage.removeItem('northstar_role')
          navigate(`/login?role=${requiredRole}`, { replace: true })
          return
        }
        const data = await res.json()
        const serverRole = data?.user?.role
        if (serverRole && serverRole !== requiredRole) {
          navigate(roleHomePath(serverRole), { replace: true })
        }
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [requiredRole, navigate])

  if (!cookieRole || !['admin', 'teacher', 'guardian'].includes(cookieRole)) {
    return <Navigate to={`/login?role=${requiredRole}`} replace />
  }
  if (cookieRole !== requiredRole) {
    return <Navigate to={roleHomePath(cookieRole)} replace />
  }
  return <>{children}</>
}

const roles = [
  {
    name: 'Admin',
    badge: 'SCHOOL LEADERSHIP',
    email: 'admin@school.demo',
    icon: ShieldCheck,
    tint: 'violet',
    accent: '#4f46e5',
    description:
      'A complete command center for principals and registrars to manage admissions, faculty, timetables, exam publishing, and school finances.',
    bullets: [
      'Manage students, families, faculty, classes & subject curricula',
      'Review, approve, and publish official term examination results',
      'Automate tuition billing, partial payments & digital receipts',
      'One-click exportable reports for board meetings & compliance',
    ],
  },
  {
    name: 'Teacher',
    badge: 'CLASSROOM EXCELLENCE',
    email: 'teacher@school.demo',
    icon: BookOpen,
    tint: 'mint',
    accent: '#0d9488',
    description:
      'A calm, focused workspace designed around your daily teaching schedule—so you spend less time on paperwork and more time with students.',
    bullets: [
      'Take morning attendance in under 30 seconds with smart rosters',
      'Enter exam marks with automatic grade & pass/fail calculation',
      'Submit completed gradebooks directly to school administration',
      'Spot at-risk learners early with live attendance & grade trends',
    ],
  },
  {
    name: 'Guardian',
    badge: 'FAMILY CONNECTION',
    email: 'guardian@school.demo',
    icon: HeartHandshake,
    tint: 'amber',
    accent: '#0284c7',
    description:
      'A welcoming, transparent window into your child’s school life—keeping parents informed on attendance, grades, and tuition from anywhere.',
    bullets: [
      'Switch effortlessly between multiple children in one family account',
      'Real-time daily attendance alerts and term attendance summaries',
      'View official published report cards and subject-wise performance',
      'Check tuition balances, due dates, and download payment receipts',
    ],
  },
]

const features = [
  {
    icon: UsersRound,
    badge: 'STUDENT SUCCESS',
    title: 'Admissions & Family Directory',
    text: 'Keep student profiles, emergency contacts, sibling relationships, and class placements organized in one searchable directory.',
  },
  {
    icon: CalendarCheck2,
    badge: 'EVERY DAY COUNTS',
    title: '30-Second Daily Attendance',
    text: 'Teachers mark Present, Late, or Absent in one tap while principals and parents get instant visibility into term attendance trends.',
  },
  {
    icon: BarChart3,
    badge: 'ACADEMIC EXCELLENCE',
    title: 'Examinations & Report Cards',
    text: 'Streamline assessment cycles from teacher marks entry to principal approval and digital report cards with customizable grading scales.',
  },
  {
    icon: Wallet,
    badge: 'EFFORTLESS FINANCE',
    title: 'Transparent Tuition & Billing',
    text: 'Generate term fee invoices, accept partial or full payments, issue instant receipts, and give families clear balance statements.',
  },
  {
    icon: LibraryBig,
    badge: 'SMART DECISIONS',
    title: 'One-Click School Reports',
    text: 'Generate enrollment, attendance, honor-roll, and fee collection reports in seconds—ready to view or download as CSV spreadsheets.',
  },
  {
    icon: ClipboardCheck,
    badge: 'TRUST & ACCOUNTABILITY',
    title: 'Complete Activity History',
    text: 'Maintain institutional trust with role-based permissions and a clear activity log of grade approvals, enrollments, and fee updates.',
  },
]

const previewTabs = {
  admin: {
    url: 'northstar.school/admin/dashboard',
    roleLabel: 'Principal & Admin Command Center',
    badge: 'LIVE CAMPUS PULSE',
    accent: '#4f46e5',
    greeting: 'Good morning, Dr. Eleanor Vance',
    subtitle: 'Here is what is happening across Northstar Academy today.',
    ctaLabel: '+ Enroll Student',
    ctaHref: '/login?role=admin',
    sidebar: ['Overview', 'Students', 'Teachers', 'Classes & Sections', 'Examinations', 'Tuition & Fees', 'Reports'],
    stats: [
      { label: 'Enrolled Students', value: '2,840', delta: '+12% this year', color: '#4f46e5' },
      { label: 'Attendance Today', value: '95.2%', delta: 'Above 94% target', color: '#0d9488' },
      { label: 'Tuition Collected', value: '92.4%', delta: 'Term 2 on track', color: '#d97706' },
    ],
    chartTitle: 'Campus Attendance & Enrollment Overview',
    leftTitle: 'Today’s Campus Highlights',
    leftItems: [
      { text: 'Term 2 Midterm Results Published', meta: 'Grade 10' },
      { text: 'Morning Attendance Completed', meta: 'All 6 Sections' },
    ],
    rightTitle: 'Upcoming School Schedule',
    rightItems: [
      { text: 'Academic Department Briefing', meta: '09:00 AM · Room 204' },
      { text: 'Parent-Teacher Showcase', meta: 'Friday · Main Hall' },
    ],
  },
  teacher: {
    url: 'northstar.school/teacher/today',
    roleLabel: 'Teacher Classroom Studio',
    badge: 'GRADE 10 · SCIENCE DEPT',
    accent: '#0d9488',
    greeting: 'Good morning, Ms. Elena Rostova',
    subtitle: 'Grade 10 · Section A & B · Biology & Chemistry',
    ctaLabel: '✓ Mark Attendance',
    ctaHref: '/login?role=teacher',
    sidebar: ['Today', 'My Classes', 'Attendance', 'Marks Entry', 'Examinations', 'Student Progress', 'Profile'],
    stats: [
      { label: 'My Students', value: '60', delta: 'Across 2 sections', color: '#0d9488' },
      { label: 'Classes Today', value: '4', delta: 'Next at 09:30 AM', color: '#2563eb' },
      { label: 'Gradebooks Due', value: '1 Left', delta: 'Term 2 Assessment', color: '#7c3aed' },
    ],
    chartTitle: 'Classroom Attendance & Assessment Trend',
    leftTitle: 'Today’s Teaching Timetable',
    leftItems: [
      { text: 'Biology · Grade 10 Section A', meta: '08:30 AM · Science Lab 2' },
      { text: 'Chemistry · Grade 10 Section B', meta: '10:15 AM · Room 108' },
    ],
    rightTitle: 'Recent Classroom Updates',
    rightItems: [
      { text: 'Midterm Biology Grades Submitted', meta: '100% Complete' },
      { text: 'Morning Roster · 97% Present', meta: 'Submitted' },
    ],
  },
  guardian: {
    url: 'northstar.school/guardian/home',
    roleLabel: 'Parent & Guardian Family Portal',
    badge: '2 CHILDREN ENROLLED',
    accent: '#0284c7',
    greeting: 'Good morning, Marcus Reynolds',
    subtitle: 'Viewing Olivia Reynolds (Grade 10) & Liam Reynolds (Grade 9)',
    ctaLabel: 'Download Report Card',
    ctaHref: '/login?role=guardian',
    sidebar: ['Family Home', 'Attendance', 'Report Cards', 'Tuition & Fees', 'Family Profile'],
    stats: [
      { label: 'Olivia’s Attendance', value: '96.7%', delta: 'Present today', color: '#0284c7' },
      { label: 'Latest Term Grade', value: 'A (91%)', delta: 'Honor Roll', color: '#0d9488' },
      { label: 'Next Tuition Due', value: 'Oct 28', delta: 'Statement ready', color: '#d97706' },
    ],
    chartTitle: 'Olivia’s Term Progress & Attendance',
    leftTitle: 'Latest Published Report Card',
    leftItems: [
      { text: 'Biology · 92 / 100 (Grade A+)', meta: 'Excellent' },
      { text: 'Mathematics · 89 / 100 (Grade A)', meta: 'Commended' },
    ],
    rightTitle: 'Upcoming Family Dates',
    rightItems: [
      { text: 'Autumn Science Fair Showcase', meta: 'Thursday · 02:00 PM' },
      { text: 'Parent-Teacher Conference', meta: 'Friday · 10:00 AM' },
    ],
  },
}

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePreview, setActivePreview] = useState('admin')
  const preview = previewTabs[activePreview]

  return (
    <main className="home-page">
      {/* Top Announcement Strip */}
      <div className="home-top-banner">
        <div className="home-top-banner-inner">
          <span className="home-status-dot" />
          <span>
            <strong>Northstar Academic Suite</strong> · Admissions, Attendance, Grading & Tuition in
            One Connected Platform
          </span>
          <div className="home-top-quick-links">
            <Link href="/login?role=admin">Admin Portal</Link>
            <span>·</span>
            <Link href="/login?role=teacher">Teacher Portal</Link>
            <span>·</span>
            <Link href="/login?role=guardian">Parent Portal</Link>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="home-nav-wrap">
        <div className="home-nav">
          <Link href="/" className="home-brand">
            <span className="home-brand-icon">
              <GraduationCap size={20} />
            </span>
            <span>
              northstar<span>.</span>
            </span>
          </Link>
          <button
            className="home-mobile-toggle"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={20} />
          </button>
          <nav className={menuOpen ? 'home-links home-links-open' : 'home-links'}>
            <a href="#roles" onClick={() => setMenuOpen(false)}>
              Portals
            </a>
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Features
            </a>
            <a href="#impact" onClick={() => setMenuOpen(false)}>
              Why Northstar
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            <Link className="home-login" href="/login">
              Sign In to Portal <ArrowUpRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-kicker">
            <Sparkles size={14} /> DESIGNED FOR MODERN K–12 SCHOOLS & ACADEMIES
          </div>
          <h1>
            More connected schools.
            <br />
            <span>Brighter futures.</span>
          </h1>
          <p>
            Bring your principals, teachers, and parents together in one calm, intuitive
            platform—from morning attendance and classroom grading to published report cards and
            tuition management.
          </p>

          <div className="hero-actions">
            <Link href="/login" className="home-primary">
              Login to your workspace <ArrowRight size={16} />
            </Link>
            <a href="#roles" className="home-secondary">
              Explore Role Portals <ChevronRight size={16} />
            </a>
          </div>

          {/* Instant 1-Click Role Launchers */}
          <div className="hero-quick-portals">
            <span className="hero-quick-label">
              <Zap size={13} /> Try an Interactive Live Demo:
            </span>
            <div className="hero-quick-pills">
              <Link href="/login?role=admin" className="hero-role-pill pill-admin">
                <ShieldCheck size={14} /> Administrator
              </Link>
              <Link href="/login?role=teacher" className="hero-role-pill pill-teacher">
                <BookOpen size={14} /> Teacher
              </Link>
              <Link href="/login?role=guardian" className="hero-role-pill pill-guardian">
                <HeartHandshake size={14} /> Parent / Guardian
              </Link>
            </div>
          </div>

          <div className="hero-proof">
            <div className="proof-avatars">
              <span>EV</span>
              <span>ER</span>
              <span>MR</span>
            </div>
            <div>
              <div className="proof-stars">
                <Sparkles size={12} /> LOVED BY EDUCATORS & FAMILIES
              </div>
              <p>Saving teachers 8+ hours every week while keeping every parent in sync</p>
            </div>
          </div>
        </div>

        {/* Interactive Multi-Role Product Preview Window */}
        <div className="hero-art" aria-label="Preview of the school dashboard">
          {/* Interactive Role Switcher Bar */}
          <div className="preview-switcher-bar">
            <div className="preview-window-dots">
              <i className="dot-red" />
              <i className="dot-amber" />
              <i className="dot-green" />
            </div>
            <div className="preview-role-tabs" role="tablist" aria-label="Interactive dashboard preview">
              {[
                { id: 'admin', label: 'Principal & Admin', icon: ShieldCheck },
                { id: 'teacher', label: 'Teacher Classroom', icon: BookOpen },
                { id: 'guardian', label: 'Parent & Family', icon: HeartHandshake },
              ].map(({ id, label, icon: TabIcon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activePreview === id}
                  className={
                    activePreview === id ? 'preview-tab-btn preview-tab-active' : 'preview-tab-btn'
                  }
                  onClick={() => setActivePreview(id)}
                >
                  <TabIcon size={13} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="preview-url-bar">
            <span className="preview-lock">
              <Lock size={11} /> https://{preview.url}
            </span>
            <span className="preview-live-pill" style={{ color: preview.accent }}>
              ● {preview.badge}
            </span>
          </div>

          <div className="preview-body">
            <div className="preview-sidebar">
              <div className="preview-brand">
                <span style={{ background: preview.accent }}>n</span> northstar.
              </div>
              {preview.sidebar.map((item, idx) => (
                <span key={item} className={idx === 0 ? 'preview-side-active' : ''}>
                  <i style={idx === 0 ? { background: preview.accent } : undefined} /> {item}
                </span>
              ))}
            </div>
            <div className="preview-main">
              <div className="preview-heading">
                <div>
                  <span>{preview.roleLabel.toUpperCase()}</span>
                  <strong>{preview.greeting}</strong>
                  <small className="preview-sub">{preview.subtitle}</small>
                </div>
                <Link
                  href={preview.ctaHref}
                  className="preview-add"
                  style={{ background: preview.accent }}
                >
                  {preview.ctaLabel}
                </Link>
              </div>

              <div className="preview-stats">
                {preview.stats.map((st) => (
                  <div key={st.label} style={{ borderTop: `3px solid ${st.color}` }}>
                    <span>{st.label}</span>
                    <b>{st.value}</b>
                    <small style={{ color: st.color }}>↗ {st.delta}</small>
                  </div>
                ))}
              </div>

              <div className="preview-chart">
                <div className="preview-chart-title">
                  {preview.chartTitle} <span>Live</span>
                </div>
                <div className="preview-chart-lines">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <svg viewBox="0 0 470 100" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={preview.accent} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={preview.accent} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 80 C35 65 48 76 83 59 S130 71 165 45 S207 62 248 33 S291 51 330 24 S372 44 407 18 S446 31 470 5 L470 100 L0 100 Z"
                    fill="url(#heroGrad)"
                  />
                  <path
                    d="M0 80 C35 65 48 76 83 59 S130 71 165 45 S207 62 248 33 S291 51 330 24 S372 44 407 18 S446 31 470 5"
                    fill="none"
                    stroke={preview.accent}
                    strokeWidth="3"
                  />
                  <path
                    d="M0 94 C35 80 48 87 83 75 S130 82 165 67 S207 75 248 59 S291 67 330 49 S372 61 407 42 S446 53 470 31"
                    fill="none"
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>

              <div className="preview-lower">
                <div>
                  <span>{preview.leftTitle}</span>
                  {preview.leftItems.map((item) => (
                    <b key={item.text}>
                      <i style={{ background: preview.accent }} /> {item.text}{' '}
                      <small>{item.meta}</small>
                    </b>
                  ))}
                </div>
                <div>
                  <span>{preview.rightTitle}</span>
                  {preview.rightItems.map((item) => (
                    <b key={item.text}>
                      <i style={{ background: preview.accent }} /> {item.text}{' '}
                      <small>{item.meta}</small>
                    </b>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="preview-float">
            <div>
              <span className="float-check">
                <Check size={14} />
              </span>
              <strong>All caught up</strong>
            </div>
            <span>Click any tab above to preview each role</span>
          </div>
        </div>
      </section>

      {/* School Impact Metrics Strip */}
      <section className="home-metrics-strip" aria-label="School impact metrics">
        <div className="home-metrics-grid">
          <div className="home-metric-item">
            <strong>98.4%</strong>
            <span>Parent Portal Engagement</span>
            <small>Families stay informed every day</small>
          </div>
          <div className="home-metric-item">
            <strong>8+ hrs</strong>
            <span>Saved Per Teacher Weekly</span>
            <small>Faster attendance & grading</small>
          </div>
          <div className="home-metric-item">
            <strong>95.2%</strong>
            <span>Daily Attendance Rate</span>
            <small>Instant morning follow-ups</small>
          </div>
          <div className="home-metric-item">
            <strong>2.4×</strong>
            <span>Faster Tuition Collection</span>
            <small>Clear digital invoices & receipts</small>
          </div>
        </div>
      </section>

      {/* 3 Role Portals Section */}
      <section className="roles-section" id="roles">
        <div className="section-intro">
          <span>MADE FOR EVERY ROLE</span>
          <h2>One school, three tailored experiences.</h2>
          <p>
            Administrators, teachers, and parents each get a dedicated workspace designed around
            their daily needs—without the extra noise.
          </p>
        </div>
        <div className="role-cards">
          {roles.map(({ name, badge, email, icon: Icon, tint, accent, description, bullets }) => (
            <article
              className="role-card"
              key={name}
              style={{ borderTop: `4px solid ${accent}` }}
            >
              <div className="role-card-top">
                <div className={`role-icon role-icon-${tint}`}>
                  <Icon size={22} />
                </div>
                <span className="role-card-badge" style={{ color: accent }}>
                  {badge}
                </span>
              </div>
              <h3>{name}</h3>
              <p>{description}</p>
              <ul className="role-bullet-list">
                {bullets.map((b) => (
                  <li key={b}>
                    <CheckCircle2 size={15} style={{ color: accent }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="role-card-footer">
                <div className="role-demo-cred">
                  <small>DEMO LOGIN</small>
                  <code>{email}</code>
                </div>
                <Link
                  href={`/login?role=${name.toLowerCase()}`}
                  className="role-link"
                  style={{ background: accent }}
                >
                  Login as {name} <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Platform Capabilities Bento Grid */}
      <section className="features-section" id="features">
        <div className="section-intro">
          <span>EVERYTHING YOUR CAMPUS NEEDS</span>
          <h2>Everything in its right place.</h2>
          <p>
            Replace disconnected spreadsheets and paper forms with connected workflows that leave
            more room for what matters most: learning.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, badge, title, text }) => (
            <article className="feature-item" key={title}>
              <div className="feature-item-top">
                <div className="feature-icon">
                  <Icon size={20} />
                </div>
                <span className="feature-badge">{badge}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Why Schools Choose Northstar */}
      <section className="arch-section" id="impact">
        <div className="section-intro">
          <span>WHY SCHOOLS CHOOSE NORTHSTAR</span>
          <h2>Built for calmer, high-performing campuses.</h2>
          <p>
            Whether you run a single academy or a growing K–12 institution, Northstar keeps every
            department and family aligned.
          </p>
        </div>
        <div className="arch-grid">
          <div className="arch-card">
            <div className="arch-icon arch-icon-blue">
              <ShieldCheck size={22} />
            </div>
            <span className="arch-tag">FOR PRINCIPALS & REGISTRARS</span>
            <h3>Complete Campus Visibility</h3>
            <p>
              See real-time enrollment numbers, daily attendance percentages, pending exam
              publications, and tuition collection rates from one executive dashboard.
            </p>
          </div>
          <div className="arch-card">
            <div className="arch-icon arch-icon-mint">
              <Award size={22} />
            </div>
            <span className="arch-tag">FOR TEACHERS & FACULTY</span>
            <h3>More Time for Teaching</h3>
            <p>
              Eliminate repetitive data entry with instant class rosters, keyboard-friendly marks
              entry, and automatic grade calculations across every subject.
            </p>
          </div>
          <div className="arch-card">
            <div className="arch-icon arch-icon-violet">
              <HeartHandshake size={22} />
            </div>
            <span className="arch-tag">FOR PARENTS & FAMILIES</span>
            <h3>Stronger Home–School Trust</h3>
            <p>
              Give parents peace of mind with transparent attendance history, official published
              report cards, and clear tuition statements on any device.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="steps-section">
        <div className="section-intro">
          <span>A SMALLER LEARNING CURVE</span>
          <h2>From sign-in to in-sync in three steps.</h2>
          <p>Thoughtfully designed so staff and families feel right at home on day one.</p>
        </div>
        <div className="steps-grid">
          <article>
            <span>01</span>
            <h3>Choose your portal</h3>
            <p>
              Sign in as an Administrator, Teacher, or Guardian to open the workspace tailored to
              your role.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>See your classes & people</h3>
            <p>
              Instantly access the students, class sections, timetables, and family members
              connected to you.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Keep the school day moving</h3>
            <p>
              Record attendance, publish grades, download report cards, and manage tuition with
              complete clarity.
            </p>
          </article>
        </div>
      </section>

      {/* High-Impact CTA Banner */}
      <section className="home-cta" id="contact">
        <div>
          <span>YOUR SCHOOL, A LITTLE MORE IN SYNC</span>
          <h2>Let’s make every school day count.</h2>
          <p className="home-cta-sub">
            Explore the live interactive demo as an Administrator, Teacher, or Parent right now.
          </p>
        </div>
        <div className="home-cta-buttons">
          <Link href="/login" className="home-cta-primary">
            Go to your workspace <ArrowRight size={16} />
          </Link>
          <div className="home-cta-role-row">
            <Link href="/login?role=admin">Admin Demo</Link>
            <Link href="/login?role=teacher">Teacher Demo</Link>
            <Link href="/login?role=guardian">Parent Demo</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <Link href="/" className="home-brand">
          <span className="home-brand-icon">
            <GraduationCap size={18} />
          </span>
          <span>
            northstar<span>.</span>
          </span>
        </Link>
        <span>Thoughtful tools for brighter school days.</span>
        <div>
          <a href="#roles">For your role</a>
          <a href="#features">Features</a>
          <a href="#impact">Why Northstar</a>
          <a href="mailto:hello@northstar.school">Contact</a>
        </div>
        <small>© 2026 Northstar Academy</small>
      </footer>
    </main>
  )
}

function LoginPage() {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const initialRole =
    roleParam === 'teacher' || roleParam === 'guardian' || roleParam === 'admin'
      ? roleParam
      : 'admin'
  return <LoginForm initialRole={initialRole} />
}

function ForbiddenPage() {
  return (
    <main className="forbidden-page">
      <div className="forbidden-icon">
        <ShieldX size={26} />
      </div>
      <span>403 · ACCESS RESTRICTED</span>
      <h1>This space isn’t part of your role.</h1>
      <p>
        Each Northstar workspace is tailored to its role. Head back to your own workspace to keep
        going.
      </p>
      <Link href="/login">
        <ArrowLeft size={15} /> Return to sign in
      </Link>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="forbidden-page">
      <div className="forbidden-icon">
        <SearchX size={25} />
      </div>
      <span>404 · PAGE NOT FOUND</span>
      <h1>We couldn’t find that page.</h1>
      <p>
        The link may have moved, or you may not have access to this part of the school workspace.
      </p>
      <Link href="/">
        <ArrowLeft size={15} /> Back to Northstar
      </Link>
    </main>
  )
}

function AdminSectionRoute() {
  const { section = 'dashboard' } = useParams()
  if (!adminNavigation.some((item) => item.href === `/admin/${section}`)) {
    return <NotFoundPage />
  }
  return (
    <RoleShell role="admin">
      <RoleWorkspace role="admin" section={section} />
    </RoleShell>
  )
}

function TeacherSectionRoute() {
  const { section = 'today' } = useParams()
  if (!teacherNavigation.some((item) => item.href === `/teacher/${section}`)) {
    return <NotFoundPage />
  }
  return (
    <RoleShell role="teacher">
      <RoleWorkspace role="teacher" section={section} />
    </RoleShell>
  )
}

function GuardianSectionRoute() {
  const { section = 'home' } = useParams()
  if (!guardianNavigation.some((item) => item.href === `/guardian/${section}`)) {
    return <NotFoundPage />
  }
  return (
    <RoleShell role="guardian">
      <RoleWorkspace role="guardian" section={section} />
    </RoleShell>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          path="/admin/dashboard"
          element={
            <RoleRouteGuard requiredRole="admin">
              <RoleShell role="admin">
                <RoleWorkspace role="admin" section="dashboard" />
              </RoleShell>
            </RoleRouteGuard>
          }
        />
        <Route
          path="/admin/:section"
          element={
            <RoleRouteGuard requiredRole="admin">
              <AdminSectionRoute />
            </RoleRouteGuard>
          }
        />

        <Route
          path="/teacher/today"
          element={
            <RoleRouteGuard requiredRole="teacher">
              <RoleShell role="teacher">
                <RoleWorkspace role="teacher" section="today" />
              </RoleShell>
            </RoleRouteGuard>
          }
        />
        <Route
          path="/teacher/:section"
          element={
            <RoleRouteGuard requiredRole="teacher">
              <TeacherSectionRoute />
            </RoleRouteGuard>
          }
        />

        <Route
          path="/guardian/home"
          element={
            <RoleRouteGuard requiredRole="guardian">
              <RoleShell role="guardian">
                <RoleWorkspace role="guardian" section="home" />
              </RoleShell>
            </RoleRouteGuard>
          }
        />
        <Route
          path="/guardian/:section"
          element={
            <RoleRouteGuard requiredRole="guardian">
              <GuardianSectionRoute />
            </RoleRouteGuard>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
