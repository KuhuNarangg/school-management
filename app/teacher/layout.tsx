import { redirect } from 'next/navigation'
import { RoleShell } from '@/components/school/role-shell'
import { getServerSession } from '@/lib/server/auth'

export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession()
  if (!session) redirect('/login?role=teacher')
  if (session.role !== 'teacher') redirect('/forbidden')
  return <RoleShell role="teacher">{children}</RoleShell>
}
