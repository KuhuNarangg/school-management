import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { RoleShell } from '@/components/school/role-shell'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = (await cookies()).get('school-demo-role')?.value
  if (session !== 'admin') redirect('/login?role=admin')
  return <RoleShell role="admin">{children}</RoleShell>
}
