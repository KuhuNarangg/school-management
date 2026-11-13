import { notFound } from 'next/navigation'
import { RoleWorkspace } from '@/components/school/role-workspace'
import { guardianNavigation } from '@/lib/api/school'

export default async function GuardianSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!guardianNavigation.some((item) => item.href === `/guardian/${section}`)) notFound()
  return <RoleWorkspace role="guardian" section={section} />
}
