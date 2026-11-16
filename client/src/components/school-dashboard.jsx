'use client';
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Download, GraduationCap, LayoutDashboard, LifeBuoy, Mail, Menu, Moon, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles, Sun, Trash2, Users, Wallet, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
const enrollmentData = [
    { month: 'Jan', students: 2680, teachers: 2050 }, { month: 'Feb', students: 2910, teachers: 2210 },
    { month: 'Mar', students: 2760, teachers: 2140 }, { month: 'Apr', students: 3350, teachers: 2510 },
    { month: 'May', students: 3100, teachers: 2380 }, { month: 'Jun', students: 3690, teachers: 2780 },
    { month: 'Jul', students: 3500, teachers: 2660 }, { month: 'Aug', students: 4230, teachers: 3140 },
    { month: 'Sep', students: 3980, teachers: 3020 }, { month: 'Oct', students: 4580, teachers: 3380 },
    { month: 'Nov', students: 4310, teachers: 3260 }, { month: 'Dec', students: 4860, teachers: 3650 },
];
const chartConfig = { students: { label: 'Students', color: 'var(--chart-1)' }, teachers: { label: 'Teachers', color: 'var(--chart-2)' } };
const students = [
    { name: 'Olivia Rhye', id: 'STU-24018', grade: 'Grade 10 · A', program: 'Science', attendance: '98%', status: 'Active', initials: 'OR', tone: 'mint' },
    { name: 'Phoenix Baker', id: 'STU-24017', grade: 'Grade 9 · B', program: 'Arts', attendance: '94%', status: 'Active', initials: 'PB', tone: 'lavender' },
    { name: 'Lana Steiner', id: 'STU-24016', grade: 'Grade 11 · A', program: 'Commerce', attendance: '88%', status: 'Review', initials: 'LS', tone: 'peach' },
    { name: 'Demi Wilkinson', id: 'STU-24015', grade: 'Grade 9 · A', program: 'Science', attendance: '96%', status: 'Active', initials: 'DW', tone: 'blue' },
    { name: 'Emma Thompson', id: 'STU-24014', grade: 'Grade 9 · A', program: 'Science', attendance: '97%', status: 'Active', initials: 'ET', tone: 'mint' },
    { name: 'Avery Johnson', id: 'STU-24013', grade: 'Grade 10 · B', program: 'Arts', attendance: '91%', status: 'Active', initials: 'AJ', tone: 'peach' },
    { name: 'Liam Walker', id: 'STU-24012', grade: 'Grade 11 · B', program: 'Science', attendance: '95%', status: 'Active', initials: 'LW', tone: 'blue' },
];
const events = [
    { time: '08:30 AM', title: 'Morning assembly', detail: 'Main auditorium', tone: 'green' },
    { time: '10:00 AM', title: 'Parent–teacher meeting', detail: 'Room 204 · Grade 10', tone: 'blue' },
    { time: '11:30 AM', title: 'Science fair review', detail: 'Innovation lab', tone: 'orange' },
];
const navItems = [
    { label: 'Overview', icon: LayoutDashboard }, { label: 'Students', icon: GraduationCap }, { label: 'Teachers', icon: Users },
    { label: 'Attendance', icon: ClipboardCheck }, { label: 'Classes', icon: BookOpen }, { label: 'Schedule', icon: CalendarDays }, { label: 'Finances', icon: Wallet },
];
const roleCopy = {
    Admin: { greeting: 'Good morning, Alex', subtitle: "Here's what's happening across your school today.", stats: [['Total students', '2,840', '+12.5%', 'green', Users], ['Teaching staff', '186', '+4.2%', 'blue', GraduationCap], ['Attendance rate', '94.6%', '+2.1%', 'purple', ClipboardCheck], ['Fees collected', '$48,290', '+8.4%', 'orange', Wallet]], title: 'Enrollment overview', chartLabel: 'Students & staff', sideTitle: 'Today at a glance' },
    Teacher: { greeting: 'Good morning, Olivia', subtitle: 'Ready for another great day in the classroom?', stats: [['My students', '124', '+4 this term', 'green', Users], ['Classes today', '5', '2 upcoming', 'blue', BookOpen], ['Avg. attendance', '96.2%', '+1.8%', 'purple', ClipboardCheck], ['Assignments', '18', '6 to review', 'orange', ClipboardCheck]], title: 'Class performance', chartLabel: 'Attendance & progress', sideTitle: 'Your schedule today' },
    Guardian: { greeting: 'Good morning, Jamie', subtitle: "Here's an update on your children's school day.", stats: [['Attendance', '97.8%', 'Excellent', 'green', ClipboardCheck], ['Upcoming tasks', '3', 'Due this week', 'blue', BookOpen], ['Latest grade', 'A−', '+4% this term', 'purple', Activity], ['School messages', '2', '1 unread', 'orange', Mail]], title: 'Learning progress', chartLabel: 'Progress & attendance', sideTitle: "Today at school" },
};
export function SchoolDashboard() {
    const [role, setRole] = useState('Admin');
    const [activeNav, setActiveNav] = useState('Overview');
    const [period, setPeriod] = useState('This year');
    const [query, setQuery] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('northstar-theme') || 'light';
        }
        return 'light';
    });
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 'notif-1', title: 'Attendance recorded', detail: 'Grade 10 · Section A attendance submitted (34/35 Present).', time: '12m ago', unread: true, type: 'attendance' },
        { id: 'notif-2', title: 'Tuition payment received', detail: 'Invoice #INV-24016 paid ($1,250.00) by Robert Steiner.', time: '45m ago', unread: true, type: 'payment' },
        { id: 'notif-3', title: 'Midterm assessments published', detail: 'Admin published official grades for 6 subjects. Guardians notified.', time: '2h ago', unread: false, type: 'exam' },
    ]);
    const unreadCount = notifications.filter((n) => n.unread).length;

    function toggleTheme() {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        if (typeof window !== 'undefined') {
            const root = document.documentElement;
            if (next === 'dark') {
                root.classList.add('dark');
                root.setAttribute('data-theme', 'dark');
            } else {
                root.classList.remove('dark');
                root.setAttribute('data-theme', 'light');
            }
            localStorage.setItem('northstar-theme', next);
        }
    }

    function markAllRead() {
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
        notify('All notifications marked as read.');
    }

    function toggleRead(id) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n)));
    }
    const copy = roleCopy[role];
    const filtered = useMemo(() => students.filter((student) => `${student.name} ${student.id} ${student.program}`.toLowerCase().includes(query.toLowerCase())), [query]);
    function notify(message) {
        setNotice(message);
        window.setTimeout(() => setNotice(''), 2600);
    }
    return (<div className="school-shell min-h-screen bg-[#f7f8fa] text-slate-900">
      <aside className={`school-sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><GraduationCap size={21} strokeWidth={2.4}/></div><span>northstar<span className="brand-period">.</span></span><button className="sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18}/></button></div>
        <div className="school-picker"><div className="school-avatar">N</div><div className="school-picker-copy"><strong>Northstar Academy</strong><span>Springfield, IL</span></div><ChevronDown size={15}/></div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setMenuOpen(false); }} className={`nav-item ${activeNav === label ? 'nav-active' : ''}`}><Icon size={17} strokeWidth={1.8}/><span>{label}</span>{label === 'Students' && <span className="nav-count">2.8k</span>}</button>)}</nav>
        <div className="sidebar-section-label tools-label">TOOLS</div>
        <nav className="side-nav"><button className={`nav-item ${activeNav === 'Reports' ? 'nav-active' : ''}`} onClick={() => setActiveNav('Reports')}><Activity size={17}/><span>Reports</span></button><button className={`nav-item ${activeNav === 'Messages' ? 'nav-active' : ''}`} onClick={() => setActiveNav('Messages')}><Mail size={17}/><span>Messages</span><span className="unread-dot"/></button></nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><LifeBuoy size={17}/></div><strong>Need a hand?</strong><p>Visit our help center for tips and tutorials.</p><button onClick={() => notify('Help center opened')}>Visit help center <ArrowRight size={13}/></button></div><button className="nav-item settings-link" onClick={() => setActiveNav('Settings')}><Settings2 size={17}/><span>Settings</span></button><div className="profile-row"><Avatar className="profile-avatar"><AvatarFallback>AR</AvatarFallback></Avatar><div className="profile-copy"><strong>Alex Rivera</strong><span>School administrator</span></div><MoreHorizontal size={18}/></div></div>
      </aside>
      {menuOpen && <button aria-label="Close navigation overlay" className="mobile-scrim" onClick={() => setMenuOpen(false)}/>}
      <main className="main-area">
        <header className="topbar">
          <button aria-label="Open navigation" className="mobile-menu" onClick={() => setMenuOpen(true)}>
            <Menu size={21}/>
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14}/>
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16}/>
              <input aria-label="Search" placeholder="Search anything..." value={query} onChange={(event) => setQuery(event.target.value)}/>
              <kbd>⌘ K</kbd>
            </label>
            <button
              className="icon-button theme-toggle-button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}
            </button>
            <div className="role-notif-wrap">
              <button
                className="icon-button notification-button"
                aria-label={`Notifications, ${unreadCount} unread`}
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell size={18}/>
                {unreadCount > 0 && <span />}
              </button>
              {notifOpen && (
                <div className="notif-dropdown" role="dialog" aria-label="Notifications panel">
                  <div className="notif-header">
                    <div className="notif-title-row">
                      <strong>Notifications</strong>
                      {unreadCount > 0 && <span className="notif-badge">{unreadCount} new</span>}
                    </div>
                    <div className="notif-header-actions">
                      {unreadCount > 0 && (
                        <button type="button" className="notif-action-btn" onClick={markAllRead}>
                          <CheckCheck size={14}/> Mark read
                        </button>
                      )}
                      <button type="button" className="notif-close-btn" onClick={() => setNotifOpen(false)} aria-label="Close">
                        <X size={15}/>
                      </button>
                    </div>
                  </div>
                  <div className="notif-list">
                    {notifications.map((item) => (
                      <div key={item.id} className={`notif-item ${item.unread ? 'notif-unread' : ''}`} onClick={() => toggleRead(item.id)}>
                        <span className={`notif-icon notif-icon-${item.type}`}>
                          {item.type === 'attendance' && <ClipboardCheck size={14}/>}
                          {item.type === 'payment' && <Wallet size={14}/>}
                          {item.type === 'exam' && <FileBarChart size={14}/>}
                        </span>
                        <div className="notif-copy">
                          <div className="notif-item-top">
                            <strong>{item.title}</strong>
                            <small>{item.time}</small>
                          </div>
                          <p>{item.detail}</p>
                        </div>
                        {item.unread && <span className="notif-unread-dot"/>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="top-divider"/>
            <div className="role-switcher" aria-label="Choose dashboard role">
              {['Admin', 'Teacher', 'Guardian'].map((item) => (
                <button key={item} className={role === item ? 'role-selected' : ''} onClick={() => setRole(item)}>{item}</button>
              ))}
            </div>
          </div>
        </header>
        <div className="content-wrap">
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> MONDAY, OCTOBER 21, 2024</div><h1>{copy.greeting}<span className="wave">✳</span></h1><p>{copy.subtitle}</p></div><div className="welcome-actions"><button className="outline-button" onClick={() => notify('Your report is ready to download')}><Download size={15}/> Export report</button><button className="primary-button" onClick={() => notify(role === 'Admin' ? 'New student form opened' : role === 'Teacher' ? 'New assignment form opened' : 'Message your school')}><Plus size={16}/> {role === 'Admin' ? 'Add' : role === 'Teacher' ? 'New assignment' : 'Contact school'}</button></div></section>
          {activeNav !== 'Overview' && <div className="section-notice"><Sparkles size={16}/> You’re viewing the <strong>{activeNav}</strong> workspace. Dashboard highlights remain below for a quick overview.</div>}
          <section className="stats-grid" aria-label={`${role} dashboard summary`}>{copy.stats.map(([label, value, trend, tone, Icon]) => <Card key={label} className="stat-card"><CardContent className="stat-content"><div className={`stat-icon stat-${tone}`}><Icon size={18} strokeWidth={1.9}/></div><span className="stat-trend"><ArrowUpRight size={13}/> {trend}</span><span className="stat-label">{label}</span><div className="stat-value">{value}</div><span className="stat-foot">Compared to last month</span></CardContent></Card>)}</section>
          <section className="middle-grid"><Card className="chart-card"><CardHeader className="chart-header"><div><div className="chart-title-row"><CardTitle>{copy.title}</CardTitle><Badge className="live-badge"><span /> Live</Badge></div><p>{copy.chartLabel} <span className="chart-period-dot">·</span> Updated just now</p></div><button className="period-select" onClick={() => setPeriod(period === 'This year' ? 'This month' : period === 'This month' ? 'This week' : 'This year')}>{period}<ChevronDown size={14}/></button></CardHeader><CardContent className="chart-content"><div className="chart-summary"><span className="chart-total">{role === 'Admin' ? '2,840' : role === 'Teacher' ? '124' : '97.8%'}<span className="chart-total-caption"> total this year</span></span><span className="chart-growth"><ArrowUpRight size={14}/> 12.8%</span></div><ChartContainer config={chartConfig} className="enrollment-chart"><AreaChart accessibilityLayer data={enrollmentData} margin={{ left: -20, right: 5, top: 8, bottom: 0 }}><defs><linearGradient id="fillStudents" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-students)" stopOpacity={0.22}/><stop offset="95%" stopColor="var(--color-students)" stopOpacity={0.01}/></linearGradient><linearGradient id="fillTeachers" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-teachers)" stopOpacity={0.14}/><stop offset="95%" stopColor="var(--color-teachers)" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#edf0f4"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#99a1af', fontSize: 11 }} tickMargin={12}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#99a1af', fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} tickCount={5}/><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #edf0f4', boxShadow: '0 8px 24px #1e293b12', fontSize: 12 }}/><Area type="monotone" dataKey="students" stroke="var(--color-students)" strokeWidth={2.5} fill="url(#fillStudents)"/><Area type="monotone" dataKey="teachers" stroke="var(--color-teachers)" strokeWidth={2} fill="url(#fillTeachers)"/></AreaChart></ChartContainer><div className="chart-legend"><span><i className="legend-students"/> Students</span><span><i className="legend-teachers"/> Teaching staff</span></div></CardContent></Card>
            <Card className="schedule-card"><CardHeader className="schedule-header"><div><div className="schedule-date">MONDAY <span>21</span></div><CardTitle>{copy.sideTitle}</CardTitle></div><button className="calendar-nav" aria-label="Previous day" onClick={() => notify('Showing previous day')}><ChevronLeft size={16}/></button><button className="calendar-nav" aria-label="Next day" onClick={() => notify('Showing next day')}><ChevronRight size={16}/></button></CardHeader><CardContent className="schedule-content">{events.map((event, index) => <div className="event-row" key={event.title}><div className="event-time">{event.time}</div><div className={`event-marker marker-${event.tone}`}><span /></div><div className="event-info"><strong>{role === 'Guardian' && index === 1 ? 'Math · Chapter 6 quiz' : role === 'Teacher' && index === 1 ? 'Grade 10 · Biology' : event.title}</strong><span>{role === 'Guardian' && index === 1 ? 'Due today · 2:00 PM' : event.detail}</span></div></div>)}<button className="schedule-link" onClick={() => { setActiveNav('Schedule'); notify('Full schedule opened'); }}>View full schedule <ArrowRight size={14}/></button></CardContent></Card></section>
          <section className="bottom-grid"><Card className="students-card"><CardHeader className="table-header"><div><CardTitle>{role === 'Admin' ? 'Recently enrolled students' : role === 'Teacher' ? 'Your students' : 'Your children'}</CardTitle><p>{role === 'Admin' ? 'Keep track of the latest student activity' : role === 'Teacher' ? 'A quick look at your classroom' : 'A quick look at recent activity'}</p></div><button className="text-action" onClick={() => setActiveNav('Students')}>View all <ArrowRight size={14}/></button></CardHeader><CardContent className="table-content"><div className="student-table"><div className="table-row table-head"><span>STUDENT</span><span>GRADE</span><span>PROGRAM</span><span>ATTENDANCE</span><span>STATUS</span></div>{filtered.map((student) => <div className="table-row" key={student.id}><div className="student-name"><Avatar className={`student-avatar avatar-${student.tone}`}><AvatarFallback>{student.initials}</AvatarFallback></Avatar><div><strong>{student.name}</strong><span>{student.id}</span></div></div><span className="grade-cell">{student.grade}</span><span className="program-cell">{student.program}</span><span className="attendance-cell"><span className="attendance-bar"><i style={{ width: student.attendance }}/></span>{student.attendance}</span><Badge className={student.status === 'Active' ? 'status-active' : 'status-review'}><span />{student.status}</Badge></div>)}{filtered.length === 0 && <div className="empty-search">No students match “{query}”.</div>}</div></CardContent></Card>
            <Card className="activity-card"><CardHeader className="activity-header"><div><CardTitle>Recent activity</CardTitle><p>What’s happening around school</p></div><button className="more-button" aria-label="More activity options" onClick={() => notify('Activity options')}><MoreHorizontal size={19}/></button></CardHeader><CardContent className="activity-content"><div className="activity-item"><div className="activity-icon activity-purple"><ShieldCheck size={15}/></div><div><strong>New student enrolled</strong><p>Emma Thompson joined Grade 9</p><span>12 minutes ago</span></div></div><div className="activity-item"><div className="activity-icon activity-blue"><ClipboardCheck size={15}/></div><div><strong>Attendance submitted</strong><p>Ms. Johnson · Class 10-A</p><span>38 minutes ago</span></div></div><div className="activity-item"><div className="activity-icon activity-orange"><Wallet size={15}/></div><div><strong>Fee payment received</strong><p>Semester 1 · $1,250.00</p><span>1 hour ago</span></div></div><button className="activity-link" onClick={() => setActiveNav('Reports')}>View activity log <ArrowRight size={14}/></button></CardContent></Card></section>
          <footer className="dashboard-footer"><span>© 2024 Northstar Academy</span><span><span className="footer-status"/> All systems operational</span><button onClick={() => notify('Help center opened')}>Help & support <ArrowRight size={13}/></button></footer>
        </div>
      </main>
      {notice && <div role="status" className="toast-message"><Check size={16}/> {notice}</div>}
    </div>);
}
