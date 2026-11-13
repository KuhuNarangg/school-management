import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { RoleShell } from '@/components/school/role-shell'

export default async function GuardianLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = (await cookies()).get('school-demo-role')?.value
  if (session !== 'guardian') redirect('/login?role=guardian')
  return <RoleShell role="guardian">{children}</RoleShell>
}
