import { NextResponse } from 'next/server'
import {
  CSRF_COOKIE_NAME,
  getRequestSession,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '@/lib/server/auth'
import { logAudit } from '@/lib/server/audit'

export async function POST(request: Request) {
  const session = await getRequestSession(request).catch(() => null)
  if (session) {
    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role.toUpperCase(),
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: session.userId,
      afterSummary: `Signed out (${session.email})`,
    }).catch(() => null)
  }

  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 })
  response.cookies.delete(SESSION_COOKIE_NAME)
  response.cookies.delete(ROLE_COOKIE_NAME)
  response.cookies.delete(CSRF_COOKIE_NAME)
  return response
}
