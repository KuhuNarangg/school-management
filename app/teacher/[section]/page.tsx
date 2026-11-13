import { notFound } from 'next/navigation'
import { RoleWorkspace } from '@/components/school/role-workspace'
import { teacherNavigation } from '@/lib/api/school'

export default async function TeacherSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!teacherNavigation.some((item) => item.href === `/teacher/${section}`)) notFound()
  return <RoleWorkspace role="teacher" section={section} />
}
