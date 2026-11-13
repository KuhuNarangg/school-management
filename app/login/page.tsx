import { LoginForm } from '@/components/school/login-form'
import type { SchoolRole } from '@/lib/types'

const roles: SchoolRole[] = ['admin', 'teacher', 'guardian']

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams
  const initialRole = roles.includes(params.role as SchoolRole) ? params.role as SchoolRole : 'admin'
  return <LoginForm initialRole={initialRole} />
}
