import { NextResponse } from 'next/server'
import { demoCredentials } from '@/lib/api/school'
import type { SchoolRole } from '@/lib/types'

const allowedRoles: SchoolRole[] = ['admin', 'teacher', 'guardian']

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { role?: string; email?: string; password?: string; remember?: boolean } | null
  if (!payload || !allowedRoles.includes(payload.role as SchoolRole)) {
    return NextResponse.json({ error: 'Choose a valid account role to continue.' }, { status: 400 })
  }

  const role = payload.role as SchoolRole
  const credentials = demoCredentials[role]
  if (payload.email?.trim().toLowerCase() !== credentials.email || payload.password !== credentials.password) {
    return NextResponse.json({ error: 'Those credentials do not match the selected demo account.' }, { status: 401 })
  }

  const response = NextResponse.json({ role, redirectTo: `/${role}/${role === 'admin' ? 'dashboard' : role === 'teacher' ? 'today' : 'home'}` })
  response.cookies.set('school-demo-role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(payload.remember ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  })
  return response
}
