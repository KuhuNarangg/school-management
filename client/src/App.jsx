import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams, useNavigate, } from 'react-router-dom';
import Link from './shims/next-link';
import { ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, BookOpen, CalendarCheck2, Check, ChevronRight, ClipboardCheck, GraduationCap, HeartHandshake, LibraryBig, Menu, SearchX, ShieldCheck, ShieldX, Sparkles, UsersRound, Wallet, } from 'lucide-react';
import { LoginForm } from './components/school/login-form';
import { RoleShell } from './components/school/role-shell';
import { RoleWorkspace } from './components/school/role-workspace';
import { adminNavigation, teacherNavigation, guardianNavigation, } from './lib/api/school';
import { readCookie } from './api-client';
function roleHomePath(role) {
    if (role === 'admin')
        return '/admin/dashboard';
    if (role === 'teacher')
        return '/teacher/today';
    return '/guardian/home';
}
function RoleRouteGuard({ requiredRole, children, }) {
    const navigate = useNavigate();
    const isCrossOrigin = Boolean(import.meta.env?.VITE_API_URL);
    const cookieRole = readCookie('school-demo-role') ||
        (isCrossOrigin ? localStorage.getItem('northstar_role') : null);
    useEffect(() => {
        let cancelled = false;
        fetch('/api/auth/me', { credentials: 'include' })
            .then(async (res) => {
            if (cancelled)
                return;
            if (!res.ok) {
                document.cookie = 'school-demo-role=; Path=/; Max-Age=0';
                document.cookie = 'northstar-csrf=; Path=/; Max-Age=0';
                localStorage.removeItem('northstar_session_token');
                localStorage.removeItem('northstar_role');
                navigate(`/login?role=${requiredRole}`, { replace: true });
                return;
            }
            const data = await res.json();
            const serverRole = data?.user?.role;
            if (serverRole && serverRole !== requiredRole) {
                navigate(roleHomePath(serverRole), { replace: true });
            }
        })
            .catch(() => null);
        return () => {
            cancelled = true;
        };
    }, [requiredRole, navigate]);
    if (!cookieRole || !['admin', 'teacher', 'guardian'].includes(cookieRole)) {
        return <Navigate to={`/login?role=${requiredRole}`} replace/>;
    }
    if (cookieRole !== requiredRole) {
        return <Navigate to={roleHomePath(cookieRole)} replace/>;
    }
    return <>{children}</>;
}
const roles = [
    {
        name: 'Admin',
        icon: ShieldCheck,
        tint: 'violet',
        description: 'A confident command center for managing the people, programs, and pulse of your whole school.',
    },
    {
        name: 'Teacher',
        icon: BookOpen,
        tint: 'mint',
        description: 'Everything you need for a more focused classroom, from attendance to assessments.',
    },
    {
        name: 'Guardian',
        icon: HeartHandshake,
        tint: 'amber',
        description: 'A friendly window into your child’s progress, schedule, and school community.',
    },
];
const features = [
    {
        icon: UsersRound,
        title: 'Student records',
        text: 'One organized home for student profiles, enrollment, and family connections.',
    },
    {
        icon: CalendarCheck2,
        title: 'Attendance',
        text: 'See daily attendance clearly and make follow-up feel effortless.',
    },
    {
        icon: BarChart3,
        title: 'Exams & results',
        text: 'Bring assessments, marks, and progress into a single view.',
    },
    {
        icon: Wallet,
        title: 'Fee management',
        text: 'Keep invoices, balances, and payment history easy to understand.',
    },
    {
        icon: LibraryBig,
        title: 'School reports',
        text: 'Turn everyday activity into useful, readable school insights.',
    },
    {
        icon: ClipboardCheck,
        title: 'Accountability',
        text: 'Give staff a shared view of important school activity and next steps.',
    },
];
function HomePage() {
    const [menuOpen, setMenuOpen] = useState(false);
    return (<main className="home-page">
      <header className="home-nav">
        <Link href="/" className="home-brand">
          <span className="home-brand-icon">
            <GraduationCap size={20}/>
          </span>
          <span>
            northstar<span>.</span>
          </span>
        </Link>
        <button className="home-mobile-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={20}/>
        </button>
        <nav className={menuOpen ? 'home-links home-links-open' : 'home-links'}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="#roles" onClick={() => setMenuOpen(false)}>
            Roles
          </a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </a>
          <Link className="home-login" href="/login">
            Login <ArrowUpRight size={15}/>
          </Link>
        </nav>
      </header>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-kicker">
            <Sparkles size={14}/> SCHOOL, IN SYNC
          </div>
          <h1>
            More connected schools.
            <br />
            <span>Brighter futures.</span>
          </h1>
          <p>
            One thoughtful place for your people, classrooms, and the little things that make every
            school day matter.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="home-primary">
              Login to your workspace <ArrowRight size={16}/>
            </Link>
            <a href="#features" className="home-secondary">
              Explore features <ChevronRight size={16}/>
            </a>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars">
              <span>AR</span>
              <span>OR</span>
              <span>JM</span>
            </div>
            <div>
              <div className="proof-stars">
                <Sparkles size={11}/> BUILT FOR EDUCATION
              </div>
              <p>Built for the whole school community</p>
            </div>
          </div>
        </div>
        <div className="hero-art" aria-label="Preview of the school dashboard">
          <div className="preview-top">
            <div className="preview-brand">
              <span>n</span> northstar
            </div>
            <div className="preview-user">AR</div>
          </div>
          <div className="preview-body">
            <div className="preview-sidebar">
              <span className="preview-side-active">
                <i /> Overview
              </span>
              <span>
                <i /> Students
              </span>
              <span>
                <i /> Attendance
              </span>
              <span>
                <i /> Classes
              </span>
              <span>
                <i /> Reports
              </span>
            </div>
            <div className="preview-main">
              <div className="preview-heading">
                <div>
                  <span>MONDAY, OCTOBER 21</span>
                  <strong>Good morning, Alex</strong>
                </div>
                <span className="preview-add">+ Add student</span>
              </div>
              <div className="preview-stats">
                <div>
                  <span>Students</span>
                  <b>2,840</b>
                  <small>↗ 12.5%</small>
                </div>
                <div>
                  <span>Attendance</span>
                  <b>94.6%</b>
                  <small>↗ 2.1%</small>
                </div>
                <div>
                  <span>Staff</span>
                  <b>186</b>
                  <small>↗ 4.2%</small>
                </div>
              </div>
              <div className="preview-chart">
                <div className="preview-chart-title">
                  Enrollment overview <span>Live</span>
                </div>
                <div className="preview-chart-lines">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <svg viewBox="0 0 470 100" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 80 C35 65 48 76 83 59 S130 71 165 45 S207 62 248 33 S291 51 330 24 S372 44 407 18 S446 31 470 5" fill="none" stroke="#48aa80" strokeWidth="3"/>
                  <path d="M0 94 C35 80 48 87 83 75 S130 82 165 67 S207 75 248 59 S291 67 330 49 S372 61 407 42 S446 53 470 31" fill="none" stroke="#8294d3" strokeWidth="2"/>
                </svg>
              </div>
              <div className="preview-lower">
                <div>
                  <span>Today at a glance</span>
                  <b>
                    <i /> Morning assembly <small>08:30 AM</small>
                  </b>
                  <b>
                    <i /> Parent meeting <small>10:00 AM</small>
                  </b>
                </div>
                <div>
                  <span>Recent activity</span>
                  <b>
                    <i /> New student enrolled
                  </b>
                  <b>
                    <i /> Attendance submitted
                  </b>
                </div>
              </div>
            </div>
          </div>
          <div className="preview-float">
            <div>
              <span className="float-check">
                <Check size={14}/>
              </span>
              <strong>All caught up</strong>
            </div>
            <span>Today’s attendance is in</span>
          </div>
        </div>
      </section>
      <section className="roles-section" id="roles">
        <div className="section-intro">
          <span>MADE FOR EVERY ROLE</span>
          <h2>A better day for everyone.</h2>
          <p>One school, three perspectives. Everyone gets the right tools without the extra noise.</p>
        </div>
        <div className="role-cards">
          {roles.map(({ name, icon: Icon, tint, description }) => (<article className="role-card" key={name}>
              <div className={`role-icon role-icon-${tint}`}>
                <Icon size={21}/>
              </div>
              <h3>{name}</h3>
              <p>{description}</p>
              <Link href={`/login?role=${name.toLowerCase()}`} className="role-link">
                Login as {name} <ArrowRight size={15}/>
              </Link>
            </article>))}
        </div>
      </section>
      <section className="features-section" id="features">
        <div className="section-intro">
          <span>THE DETAILS, TAKEN CARE OF</span>
          <h2>Everything in its right place.</h2>
          <p>Simple, connected workflows leave more room for what matters most: learning.</p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }) => (<article className="feature-item" key={title}>
              <div className="feature-icon">
                <Icon size={19}/>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>))}
        </div>
      </section>
      <section className="steps-section">
        <div className="section-intro">
          <span>A SMALLER LEARNING CURVE</span>
          <h2>From sign-in to in-sync.</h2>
          <p>Three simple steps bring your school day together.</p>
        </div>
        <div className="steps-grid">
          <article>
            <span>01</span>
            <h3>Choose your space</h3>
            <p>Sign in to the workspace built around your role.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Find your people</h3>
            <p>See the classes, students, and family members connected to you.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Keep the day moving</h3>
            <p>Take care of everyday tasks with clarity and confidence.</p>
          </article>
        </div>
      </section>
      <section className="home-cta" id="contact">
        <div>
          <span>YOUR SCHOOL, A LITTLE MORE IN SYNC</span>
          <h2>Let’s make every school day count.</h2>
        </div>
        <Link href="/login">
          Go to your workspace <ArrowRight size={16}/>
        </Link>
      </section>
      <footer className="home-footer">
        <Link href="/" className="home-brand">
          <span className="home-brand-icon">
            <GraduationCap size={18}/>
          </span>
          <span>
            northstar<span>.</span>
          </span>
        </Link>
        <span>Thoughtful tools for brighter school days.</span>
        <div>
          <a href="#features">Features</a>
          <a href="#roles">For your role</a>
          <a href="mailto:hello@northstar.school">Contact</a>
        </div>
        <small>© 2026 Northstar Academy</small>
      </footer>
    </main>);
}
function LoginPage() {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role');
    const initialRole = roleParam === 'teacher' || roleParam === 'guardian' || roleParam === 'admin' ? roleParam : 'admin';
    return <LoginForm initialRole={initialRole}/>;
}
function ForbiddenPage() {
    return (<main className="forbidden-page">
      <div className="forbidden-icon">
        <ShieldX size={26}/>
      </div>
      <span>403 · ACCESS RESTRICTED</span>
      <h1>This space isn’t part of your role.</h1>
      <p>
        Each Northstar workspace is tailored to its role. Head back to your own workspace to keep
        going.
      </p>
      <Link href="/login">
        <ArrowLeft size={15}/> Return to sign in
      </Link>
    </main>);
}
function NotFoundPage() {
    return (<main className="forbidden-page">
      <div className="forbidden-icon">
        <SearchX size={25}/>
      </div>
      <span>404 · PAGE NOT FOUND</span>
      <h1>We couldn’t find that page.</h1>
      <p>
        The link may have moved, or you may not have access to this part of the school workspace.
      </p>
      <Link href="/">
        <ArrowLeft size={15}/> Back to Northstar
      </Link>
    </main>);
}
function AdminSectionRoute() {
    const { section = 'dashboard' } = useParams();
    if (!adminNavigation.some((item) => item.href === `/admin/${section}`)) {
        return <NotFoundPage />;
    }
    return (<RoleShell role="admin">
      <RoleWorkspace role="admin" section={section}/>
    </RoleShell>);
}
function TeacherSectionRoute() {
    const { section = 'today' } = useParams();
    if (!teacherNavigation.some((item) => item.href === `/teacher/${section}`)) {
        return <NotFoundPage />;
    }
    return (<RoleShell role="teacher">
      <RoleWorkspace role="teacher" section={section}/>
    </RoleShell>);
}
function GuardianSectionRoute() {
    const { section = 'home' } = useParams();
    if (!guardianNavigation.some((item) => item.href === `/guardian/${section}`)) {
        return <NotFoundPage />;
    }
    return (<RoleShell role="guardian">
      <RoleWorkspace role="guardian" section={section}/>
    </RoleShell>);
}
export function App() {
    return (<BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />}/>
        <Route path="/login" element={<LoginPage />}/>
        <Route path="/forbidden" element={<ForbiddenPage />}/>

        <Route path="/admin/dashboard" element={<RoleRouteGuard requiredRole="admin">
              <RoleShell role="admin">
                <RoleWorkspace role="admin" section="dashboard"/>
              </RoleShell>
            </RoleRouteGuard>}/>
        <Route path="/admin/:section" element={<RoleRouteGuard requiredRole="admin">
              <AdminSectionRoute />
            </RoleRouteGuard>}/>

        <Route path="/teacher/today" element={<RoleRouteGuard requiredRole="teacher">
              <RoleShell role="teacher">
                <RoleWorkspace role="teacher" section="today"/>
              </RoleShell>
            </RoleRouteGuard>}/>
        <Route path="/teacher/:section" element={<RoleRouteGuard requiredRole="teacher">
              <TeacherSectionRoute />
            </RoleRouteGuard>}/>

        <Route path="/guardian/home" element={<RoleRouteGuard requiredRole="guardian">
              <RoleShell role="guardian">
                <RoleWorkspace role="guardian" section="home"/>
              </RoleShell>
            </RoleRouteGuard>}/>
        <Route path="/guardian/:section" element={<RoleRouteGuard requiredRole="guardian">
              <GuardianSectionRoute />
            </RoleRouteGuard>}/>

        <Route path="*" element={<NotFoundPage />}/>
      </Routes>
    </BrowserRouter>);
}
export default App;
