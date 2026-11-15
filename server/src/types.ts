export type SchoolRole = 'admin' | 'teacher' | 'guardian'

export type SchoolUser = {
  role: SchoolRole
  name: string
  email: string
  initials: string
}

export type StudentRecord = {
  name: string
  id: string
  grade: string
  program: string
  attendance: string
  status: 'Active' | 'Review'
  initials: string
}

export type SchoolSection = {
  label: string
  href: string
  group: string
  count?: number
  shortcut?: string
}
