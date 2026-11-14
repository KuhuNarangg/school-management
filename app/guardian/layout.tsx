import { redirect } from 'next/navigation'
import { RoleShell } from '@/components/school/role-shell'
import { getServerSession } from '@/lib/server/auth'

export default async function GuardianLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession()
  if (!session) redirect('/login?role=guardian')
  if (session.role !== 'guardian') redirect('/forbidden')
  return <RoleShell role="guardian">{children}</RoleShell>
}
