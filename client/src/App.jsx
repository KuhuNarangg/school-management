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
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  Layers,
  LibraryBig,
  Lock,
  Menu,
  SearchX,
  Server,
  ShieldCheck,
  ShieldX,
  Sparkles,
  TrendingUp,
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
    badge: 'INSTITUTIONAL COMMAND',
    email: 'admin@school.demo',
    icon: ShieldCheck,
    tint: 'violet',
    accent: '#4f46e5',
    description:
      'Complete institutional oversight across students, faculty, academic structure, fee ledgers, exam publishing, and immutable audit logs.',
    bullets: [
      'Full CRUD for Students, Guardians, Teachers, Classes & Subjects',
      'Publish or unlock examination results with audit trail',
      'Double-entry fee invoicing, partial payments & reversals',
      'CSV exportable school-wide reports & live KPI analytics',
    ],
  },
  {
    name: 'Teacher',
    badge: 'CLASSROOM STUDIO',
    email: 'teacher@school.demo',
    icon: BookOpen,
    tint: 'mint',
    accent: '#0d9488',
    description:
      'A focused, zero-clutter teaching workspace strictly scoped to your assigned classes, sections, and academic subjects.',
    bullets: [
      'Same-day attendance roster with Present, Late & Absent toggles',
      'Subject marks entry with automatic max-marks validation',
      'Submit draft gradebooks to administration for review',
      'Track student academic performance across assigned sections',
    ],
  },
  {
    name: 'Guardian',
    badge: 'FAMILY PORTAL',
    email: 'guardian@school.demo',
    icon: HeartHandshake,
    tint: 'amber',
    accent: '#0284c7',
    description:
      'A transparent, real-time window into your linked children’s daily attendance, published report cards, and tuition fee statements.',
    bullets: [
      'Instant multi-child switcher for families with multiple learners',
      'Term attendance percentages & daily attendance history',
      'Official published examination report cards & subject grades',
      'Online tuition invoice ledger, receipts & balance tracking',
    ],
  },
]

const features = [
  {
    icon: UsersRound,
    badge: 'RELATIONAL DIRECTORY',
    title: 'Unified Student & Family Graph',
    text: 'Many-to-many Guardian–Student links, class-section enrollment, and department-mapped faculty profiles backed by 20 Mongoose models.',
  },
  {
    icon: CalendarCheck2,
    badge: 'CONCURRENCY SAFE',
    title: 'Real-Time Attendance Engine',
    text: 'Enforces compound unique constraints on (student, date, session) to prevent duplicate entries while computing live 30-day attendance rates.',
  },
  {
    icon: BarChart3,
    badge: 'WORKFLOW STATE MACHINE',
    title: 'Examinations & Auto-Grading',
    text: 'End-to-end DRAFT → SUBMITTED → PUBLISHED result pipeline with configurable grade bands (A+ to F) and automatic pass/fail evaluation.',
  },
  {
    icon: Wallet,
    badge: 'INTEGER MINOR-UNIT LEDGER',
    title: 'Precision Fee & Payment Accounting',
    text: 'Zero-float integer cent arithmetic, atomic payment transactions, partial payments, receipt numbers, and reversal audit entries.',
  },
  {
    icon: LibraryBig,
    badge: 'EXECUTIVE ANALYTICS',
    title: '6 Live Exportable School Reports',
    text: 'Generate real-time Student, Attendance, Academic Performance, Examination, Fee Collection, and Outstanding Balance reports with 1-click CSV export.',
  },
  {
    icon: ClipboardCheck,
    badge: 'ZERO-TRUST SECURITY',
    title: 'Server-Enforced RBAC & Audit Logs',
    text: 'Signed HS256 JWT sessions, bcryptjs password hashing, CSRF verification, and an immutable AuditLog recording every state change.',
  },
]

const previewTabs = {
  admin: {
    url: 'northstar.school/admin/dashboard',
    roleLabel: 'Administrator Command Center',
    badge: 'LIVE MONGODB ATLAS',
    accent: '#4f46e5',
    greeting: 'Good morning, Dr. Eleanor Vance',
    subtitle: 'Here is what is happening across Northstar Academy today.',
    ctaLabel: '+ Enroll Student',
    ctaHref: '/login?role=admin',
    sidebar: ['Overview', 'Students', 'Teachers', 'Classes & Sections', 'Examinations', 'Fees & Invoices', 'Audit Logs'],
    stats: [
      { label: 'Total Students', value: '60', delta: '+12 this term', color: '#4f46e5' },
      { label: 'Attendance Rate', value: '95.2%', delta: '30-day avg', color: '#0d9488' },
      { label: 'Fees Collected', value: '$17,250', delta: '78% of target', color: '#d97706' },
    ],
    chartTitle: 'School-Wide Attendance & Enrollment Velocity',
    leftTitle: 'Recent Audit Trail',
    leftItems: [
      { text: 'Exam PUBLISHED · Midterm 2026', meta: '2m ago' },
      { text: 'Payment RCP-1042 · $650.00 recorded', meta: '14m ago' },
    ],
    rightTitle: 'Department Overview',
    rightItems: [
      { text: 'Grade 10 · Section A & B (96% present)', meta: 'Room 204' },
      { text: 'Grade 11 · STEM Track (All marks in)', meta: 'Lab 3' },
    ],
  },
  teacher: {
    url: 'northstar.school/teacher/today',
    roleLabel: 'Teacher Classroom Studio',
    badge: 'SCOPED TO ASSIGNED CLASSES',
    accent: '#0d9488',
    greeting: 'Good morning, Ms. Elena Rostova',
    subtitle: 'Grade 10 · Section A & B · Biology & Chemistry',
    ctaLabel: '✓ Mark Attendance',
    ctaHref: '/login?role=teacher',
    sidebar: ['Today', 'My Classes', 'Attendance', 'Marks Entry', 'Examinations', 'Student Performance', 'Profile'],
    stats: [
      { label: 'My Students', value: '20', delta: '2 assigned sections', color: '#0d9488' },
      { label: 'Classes Today', value: '4', delta: 'Next: 09:30 AM', color: '#2563eb' },
      { label: 'Marks Pending', value: '1 Paper', delta: 'Term 2 Assessment', color: '#7c3aed' },
    ],
    chartTitle: 'Section A & B Weekly Attendance Trend',
    leftTitle: 'Today’s Teaching Schedule',
    leftItems: [
      { text: 'Biology · Grade 10 Section A', meta: '08:30 AM · Lab 2' },
      { text: 'Chemistry · Grade 10 Section B', meta: '10:15 AM · Room 108' },
    ],
    rightTitle: 'Gradebook Action Items',
    rightItems: [
      { text: 'Midterm Biology Marks · Published', meta: '20 / 20 graded' },
      { text: 'Today’s Roster · 19 Present, 1 Late', meta: 'Synced' },
    ],
  },
  guardian: {
    url: 'northstar.school/guardian/home',
    roleLabel: 'Guardian Family Portal',
    badge: 'MULTI-CHILD LINKED',
    accent: '#0284c7',
    greeting: 'Good morning, Marcus Reynolds',
    subtitle: 'Viewing Olivia Reynolds (Grade 10 · Section A) & Liam Reynolds',
    ctaLabel: 'View Report Card',
    ctaHref: '/login?role=guardian',
    sidebar: ['Family Home', 'Attendance History', 'Published Results', 'Tuition & Fees', 'Family Profile'],
    stats: [
      { label: 'Olivia’s Attendance', value: '96.7%', delta: '29/30 days present', color: '#0284c7' },
      { label: 'Latest Exam Grade', value: 'A (91%)', delta: 'Midterm Published', color: '#0d9488' },
      { label: 'Tuition Balance', value: '$600.00', delta: '1 partial invoice', color: '#d97706' },
    ],
    chartTitle: 'Olivia’s Academic & Attendance Progress',
    leftTitle: 'Published Report Card Highlights',
    leftItems: [
      { text: 'Biology · 92 / 100 (Grade A+)', meta: 'Passed' },
      { text: 'Mathematics · 89 / 100 (Grade A)', meta: 'Passed' },
    ],
    rightTitle: 'Family Tuition & Events',
    rightItems: [
      { text: 'Receipt RCP-2026-001 · $650 Paid', meta: 'Verified' },
      { text: 'Parent-Teacher Conference', meta: 'Friday, 10:00 AM' },
    ],
  },
}

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePreview, setActivePreview] = useState('admin')
  const preview = previewTabs[activePreview]

  return (
    <main className="home-page">
      {/* Top Announcement / System Status Strip */}
      <div className="home-top-banner">
        <div className="home-top-banner-inner">
          <span className="home-status-dot" />
          <span>
            <strong>Northstar Cloud OS 2.0</strong> · Powered by React 19, Express 5 & MongoDB Atlas
          </span>
          <div className="home-top-quick-links">
            <Link href="/login?role=admin">Admin Demo</Link>
            <span>·</span>
            <Link href="/login?role=teacher">Teacher Demo</Link>
            <span>·</span>
            <Link href="/login?role=guardian">Guardian Demo</Link>
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
              Role Portals
            </a>
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Platform Capabilities
            </a>
            <a href="#architecture" onClick={() => setMenuOpen(false)}>
              MERN Architecture
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Get Started
            </a>
            <Link className="home-login" href="/login">
              Launch Workspace <ArrowUpRight size={15} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-kicker">
            <Sparkles size={14} /> NEXT-GEN ACADEMIC OPERATING SYSTEM
          </div>
          <h1>
            More connected schools.
            <br />
            <span>Brighter futures.</span>
          </h1>
          <p>
            One unified, high-velocity platform connecting administrators, educators, and families —
            engineered with real-time MongoDB Atlas persistence, strict role-based security, and
            precision financial ledgers.
          </p>

          <div className="hero-actions">
            <Link href="/login" className="home-primary">
              Login to your workspace <ArrowRight size={16} />
            </Link>
            <a href="#roles" className="home-secondary">
              Explore 3 Role Portals <ChevronRight size={16} />
            </a>
          </div>

          {/* Instant 1-Click Role Launchers */}
          <div className="hero-quick-portals">
            <span className="hero-quick-label">
              <Zap size={13} /> Instant Demo Access:
            </span>
            <div className="hero-quick-pills">
              <Link href="/login?role=admin" className="hero-role-pill pill-admin">
                <ShieldCheck size={14} /> Administrator
              </Link>
              <Link href="/login?role=teacher" className="hero-role-pill pill-teacher">
                <BookOpen size={14} /> Teacher
              </Link>
              <Link href="/login?role=guardian" className="hero-role-pill pill-guardian">
                <HeartHandshake size={14} /> Guardian
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
                <Sparkles size={12} /> ENTERPRISE GRADE · MERN STACK
              </div>
              <p>20 Mongoose Models · Zero-Trust RBAC · Real-Time Cloud Sync</p>
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
                { id: 'admin', label: 'Admin Portal', icon: ShieldCheck },
                { id: 'teacher', label: 'Teacher Studio', icon: BookOpen },
                { id: 'guardian', label: 'Guardian Portal', icon: HeartHandshake },
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
                  {preview.chartTitle} <span>Live Telemetry</span>
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
              <strong>Real-Time Atlas Sync</strong>
            </div>
            <span>Click any tab above to preview each role</span>
          </div>
        </div>
      </section>

      {/* Live Institutional Metrics Strip */}
      <section className="home-metrics-strip" aria-label="Platform key metrics">
        <div className="home-metrics-grid">
          <div className="home-metric-item">
            <strong>20</strong>
            <span>Mongoose Cloud Schemas</span>
            <small>Indexed & relationally linked</small>
          </div>
          <div className="home-metric-item">
            <strong>3 Portals</strong>
            <span>Admin · Teacher · Guardian</span>
            <small>Strict server-side RBAC scope</small>
          </div>
          <div className="home-metric-item">
            <strong>95.2%</strong>
            <span>Live Attendance Tracking</span>
            <small>Unique daily session constraints</small>
          </div>
          <div className="home-metric-item">
            <strong>100%</strong>
            <span>Integer Cent Fee Ledger</span>
            <small>Zero floating-point drift</small>
          </div>
        </div>
      </section>

      {/* 3 Role Portals Section */}
      <section className="roles-section" id="roles">
        <div className="section-intro">
          <span>THREE DEDICATED PORTALS · ONE UNIFIED DATABASE</span>
          <h2>Purpose-built workspaces for every role.</h2>
          <p>
            Every endpoint and UI view is tailored and server-scoped to the signed-in user’s role —
            delivering institutional power without visual clutter.
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
              <h3>{name} Portal</h3>
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
                  <small>DEMO ACCOUNT</small>
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
          <span>ENTERPRISE ACADEMIC INFRASTRUCTURE</span>
          <h2>Engineered for institutional precision.</h2>
          <p>
            Every module is backed by strict Zod validation, atomic database invariants, and
            real-time MongoDB Atlas queries.
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

      {/* MERN Stack Architecture Showcase */}
      <section className="arch-section" id="architecture">
        <div className="section-intro">
          <span>MODERN CLOUD ARCHITECTURE</span>
          <h2>Built on the industry-standard MERN stack.</h2>
          <p>
            Decoupled client and server architecture designed for seamless cloud deployment on
            Vercel, Render, and MongoDB Atlas.
          </p>
        </div>
        <div className="arch-grid">
          <div className="arch-card">
            <div className="arch-icon arch-icon-blue">
              <Layers size={22} />
            </div>
            <span className="arch-tag">FRONTEND · VERCEL</span>
            <h3>React 19 + Vite 6 SPA</h3>
            <p>
              Lightning-fast client-side routing with React Router v7, Tailwind CSS v4, Shadcn UI
              components, Recharts telemetry, and instant command palette (⌘K).
            </p>
          </div>
          <div className="arch-card">
            <div className="arch-icon arch-icon-mint">
              <Server size={22} />
            </div>
            <span className="arch-tag">BACKEND API · RENDER</span>
            <h3>Node.js + Express 5 REST API</h3>
            <p>
              21 modular REST endpoints protected by Zod schema validation, HS256 JWT sessions
              (jose), bcryptjs hashing, and CSRF verification.
            </p>
          </div>
          <div className="arch-card">
            <div className="arch-icon arch-icon-violet">
              <Database size={22} />
            </div>
            <span className="arch-tag">CLOUD DATABASE · ATLAS</span>
            <h3>MongoDB Atlas + Mongoose 8</h3>
            <p>
              20 relational document schemas with compound unique indexes, cascading cleanup, and
              serialized transaction queues for ledger accuracy.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="steps-section">
        <div className="section-intro">
          <span>ZERO CONFIGURATION ONBOARDING</span>
          <h2>From sign-in to full school sync in seconds.</h2>
          <p>Pre-seeded with realistic academic data so you can evaluate every workflow immediately.</p>
        </div>
        <div className="steps-grid">
          <article>
            <span>01</span>
            <h3>Select your portal role</h3>
            <p>
              Choose Administrator, Teacher, or Guardian on the sign-in screen — demo credentials
              auto-fill in one click.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Explore live MongoDB data</h3>
            <p>
              Interact with 60 enrolled students, 6 class sections, 30 days of attendance, published
              exams, and live fee invoices.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Execute real workflows</h3>
            <p>
              Mark daily attendance, enter and publish exam marks, record partial fee payments, and
              inspect the immutable audit log.
            </p>
          </article>
        </div>
      </section>

      {/* High-Impact CTA Banner */}
      <section className="home-cta" id="contact">
        <div>
          <span>READY TO EXPLORE NORTHSTAR ACADEMY?</span>
          <h2>Experience all three portals live right now.</h2>
          <p className="home-cta-sub">
            Sign in with 1-click demo credentials to test Admin, Teacher, and Guardian workflows end
            to end.
          </p>
        </div>
        <div className="home-cta-buttons">
          <Link href="/login" className="home-cta-primary">
            Go to Workspace Sign-In <ArrowRight size={16} />
          </Link>
          <div className="home-cta-role-row">
            <Link href="/login?role=admin">Admin</Link>
            <Link href="/login?role=teacher">Teacher</Link>
            <Link href="/login?role=guardian">Guardian</Link>
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
        <span>Enterprise School Management System · React · Express · Node · MongoDB Atlas</span>
        <div>
          <a href="#roles">Role Portals</a>
          <a href="#features">Capabilities</a>
          <a href="#architecture">Architecture</a>
          <Link href="/login">Sign In</Link>
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
