export const demoCredentials = {
    admin: { email: 'admin@school.demo', password: 'Demo@1234' },
    teacher: { email: 'teacher@school.demo', password: 'Demo@1234' },
    guardian: { email: 'guardian@school.demo', password: 'Demo@1234' },
};
export const demoUsers = {
    admin: { role: 'admin', name: 'Alex Rivera', email: demoCredentials.admin.email, initials: 'AR' },
    teacher: { role: 'teacher', name: 'Olivia Rhye', email: demoCredentials.teacher.email, initials: 'OR' },
    guardian: { role: 'guardian', name: 'Jamie Morgan', email: demoCredentials.guardian.email, initials: 'JM' },
};
export const adminNavigation = [
    { group: 'Management', label: 'Overview', href: '/admin/dashboard', shortcut: 'D' },
    { group: 'Management', label: 'Students', href: '/admin/students', shortcut: 'S' },
    { group: 'Management', label: 'Guardians', href: '/admin/guardians' },
    { group: 'Management', label: 'Teachers', href: '/admin/teachers' },
    { group: 'Management', label: 'Classes & Sections', href: '/admin/classes' },
    { group: 'Academics', label: 'Subjects', href: '/admin/subjects' },
    { group: 'Academics', label: 'Teacher Assignments', href: '/admin/assignments' },
    { group: 'Academics', label: 'Attendance', href: '/admin/attendance', shortcut: 'A' },
    { group: 'Academics', label: 'Examinations', href: '/admin/examinations', shortcut: 'E' },
    { group: 'Academics', label: 'Results', href: '/admin/results' },
    { group: 'Finance', label: 'Fee Management', href: '/admin/fees', count: 12, shortcut: 'F' },
    { group: 'Finance', label: 'Reports', href: '/admin/reports' },
    { group: 'System', label: 'Audit Logs', href: '/admin/audit-logs' },
    { group: 'System', label: 'Settings', href: '/admin/settings' },
];
export const teacherNavigation = [
    { group: 'Daily', label: 'Overview', href: '/teacher/today', shortcut: 'D' },
    { group: 'Daily', label: 'My Classes', href: '/teacher/classes' },
    { group: 'Daily', label: 'Attendance', href: '/teacher/attendance', shortcut: 'A' },
    { group: 'Academics', label: 'Examinations', href: '/teacher/examinations', shortcut: 'E' },
    { group: 'Academics', label: 'Marks Entry', href: '/teacher/marks', count: 3 },
    { group: 'Academics', label: 'Student Performance', href: '/teacher/performance' },
    { group: 'Account', label: 'My Profile', href: '/teacher/profile' },
];
export const guardianNavigation = [
    { group: 'Family', label: 'Home', href: '/guardian/home', shortcut: 'D' },
    { group: 'Family', label: 'Attendance', href: '/guardian/attendance', shortcut: 'A' },
    { group: 'Family', label: 'Results', href: '/guardian/results', shortcut: 'E' },
    { group: 'Family', label: 'Fees', href: '/guardian/fees', count: 1, shortcut: 'F' },
    { group: 'Family', label: 'Profile', href: '/guardian/profile' },
];
export const schoolStudents = [
    { name: 'Olivia Rhye', id: 'STU-24018', grade: 'Grade 10 · A', program: 'Science', attendance: '98%', status: 'Active', initials: 'OR' },
    { name: 'Phoenix Baker', id: 'STU-24017', grade: 'Grade 9 · B', program: 'Arts', attendance: '94%', status: 'Active', initials: 'PB' },
    { name: 'Lana Steiner', id: 'STU-24016', grade: 'Grade 11 · A', program: 'Commerce', attendance: '88%', status: 'Review', initials: 'LS' },
    { name: 'Demi Wilkinson', id: 'STU-24015', grade: 'Grade 8 · C', program: 'Science', attendance: '96%', status: 'Active', initials: 'DW' },
    { name: 'Emma Thompson', id: 'STU-24014', grade: 'Grade 9 · A', program: 'Science', attendance: '97%', status: 'Active', initials: 'ET' },
    { name: 'Avery Johnson', id: 'STU-24013', grade: 'Grade 10 · B', program: 'Arts', attendance: '91%', status: 'Active', initials: 'AJ' },
];
export const teacherStudents = schoolStudents.filter((student) => student.grade.startsWith('Grade 10'));
export const guardianChildren = schoolStudents.filter((student) => ['Olivia Rhye', 'Phoenix Baker'].includes(student.name));
export const attendanceSummary = [
    { day: 'Mon', present: 92, absent: 5, late: 3 }, { day: 'Tue', present: 96, absent: 2, late: 2 },
    { day: 'Wed', present: 91, absent: 6, late: 3 }, { day: 'Thu', present: 97, absent: 2, late: 1 },
    { day: 'Fri', present: 94, absent: 4, late: 2 },
];
export const pageDescriptions = {
    dashboard: 'A clear view of the numbers, people, and priorities shaping your school day.', students: 'Manage student records, enrollment, and classroom placement.', guardians: 'Keep family contacts and student connections in one place.', teachers: 'Manage staff profiles, teaching loads, and school access.', classes: 'Review your assigned classes, grade sections, and rosters.', subjects: 'Keep the curriculum and subject catalog up to date.', assignments: 'Review teacher assignments across classes and terms.', attendance: 'Monitor attendance patterns and follow up on exceptions.', examinations: 'Plan examination schedules and track assessment progress.', results: 'See the latest progress shared by your children’s teachers.', fees: 'Track invoices, balances, and recent payments.', reports: 'Explore useful summaries across the school.', 'audit-logs': 'Review recent administrative activity and account changes.', settings: 'Manage school preferences and workspace settings.', today: 'Your assigned classes, attendance, and marking priorities for today.', marks: 'Enter assessment marks and review work still to complete.', performance: 'Follow progress for students in your assigned classes.', profile: 'Manage your contact details and school account.', home: 'A simple, up-to-date view of your family’s school day.',
};
export function labelForSection(section) {
    return section === 'dashboard' ? 'Overview' : section === 'today' ? 'Today' : section === 'classes' ? 'Classes & Sections' : section === 'fees' ? 'Fee Management' : section === 'audit-logs' ? 'Audit Logs' : section === 'marks' ? 'Marks Entry' : section === 'home' ? 'Home' : section.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}
