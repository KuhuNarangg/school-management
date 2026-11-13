import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { RoleShell } from '@/components/school/role-shell'

export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = (await cookies()).get('school-demo-role')?.value
  if (session !== 'teacher') redirect('/login?role=teacher')
  return <RoleShell role="teacher">{children}</RoleShell>
}
