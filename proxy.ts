import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import type { SchoolRole } from '@/lib/types'

const roles: SchoolRole[] = ['admin', 'teacher', 'guardian']

async function readVerifiedRole(request: NextRequest): Promise<SchoolRole | undefined> {
  const token = request.cookies.get('northstar-session')?.value
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.SESSION_SECRET || 'northstar-school-super-secret-jwt-key-2026-production-grade',
      )
      const { payload } = await jwtVerify(token, secret)
      if (roles.includes(payload.role as SchoolRole)) {
        return payload.role as SchoolRole
      }
    } catch {
      return undefined
    }
  }
  const fallback = request.cookies.get('school-demo-role')?.value as SchoolRole | undefined
  if (fallback && roles.includes(fallback)) return fallback
  return undefined
}

export async function proxy(request: NextRequest) {
  const current = request.nextUrl.pathname.split('/')[1] as SchoolRole
  if (!roles.includes(current)) return NextResponse.next()
  const sessionRole = await readVerifiedRole(request)
  if (!sessionRole || !roles.includes(sessionRole)) {
    const destination = new URL('/login', request.url)
    destination.searchParams.set('role', current)
    return NextResponse.redirect(destination)
  }
  if (sessionRole !== current) {
    return NextResponse.redirect(
      new URL(
        `/${sessionRole}/${sessionRole === 'admin' ? 'dashboard' : sessionRole === 'teacher' ? 'today' : 'home'}`,
        request.url,
      ),
    )
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/teacher/:path*', '/guardian/:path*'] }
