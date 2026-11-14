import { redirect } from 'next/navigation'
import { RoleShell } from '@/components/school/role-shell'
import { getServerSession } from '@/lib/server/auth'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession()
  if (!session) redirect('/login?role=admin')
  if (session.role !== 'admin') redirect('/forbidden')
  return <RoleShell role="admin">{children}</RoleShell>
}
