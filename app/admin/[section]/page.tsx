import { notFound } from 'next/navigation'
import { RoleWorkspace } from '@/components/school/role-workspace'
import { adminNavigation } from '@/lib/api/school'

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!adminNavigation.some((item) => item.href === `/admin/${section}`)) notFound()
  return <RoleWorkspace role="admin" section={section} />
}
