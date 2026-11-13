import { NextRequest, NextResponse } from 'next/server'
import type { SchoolRole } from '@/lib/types'

const roles: SchoolRole[] = ['admin', 'teacher', 'guardian']

export function proxy(request: NextRequest) {
  const current = request.nextUrl.pathname.split('/')[1] as SchoolRole
  if (!roles.includes(current)) return NextResponse.next()
  const sessionRole = request.cookies.get('school-demo-role')?.value as SchoolRole | undefined
  if (!sessionRole || !roles.includes(sessionRole)) {
    const destination = new URL('/login', request.url)
    destination.searchParams.set('role', current)
    return NextResponse.redirect(destination)
  }
  if (sessionRole !== current) return NextResponse.redirect(new URL(`/${sessionRole}/${sessionRole === 'admin' ? 'dashboard' : sessionRole === 'teacher' ? 'today' : 'home'}`, request.url))
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/teacher/:path*', '/guardian/:path*'] }
