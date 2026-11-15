import { NextResponse } from '../../../utils/http'
import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  recordFailedLogin,
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'
import type { SchoolRole } from '../../../types'

const loginSchema = z.object({
  role: z.enum(['admin', 'teacher', 'guardian']),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password to continue.'),
  remember: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Choose a valid account role to continue.' }, { status: 400 })
    }

    const parsed = loginSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Choose a valid account role to continue.' },
        { status: 400 },
      )
    }

    const { role, email, password, remember } = parsed.data
    const normalizedEmail = email.toLowerCase()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const rateKey = `${ip}:${normalizedEmail}`

    const rateStatus = checkLoginRateLimit(rateKey)
    if (!rateStatus.allowed) {
      return NextResponse.json(
        { error: `Too many sign-in attempts. Please wait ${rateStatus.retryAfterSeconds}s and try again.` },
        { status: 429 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== 'ACTIVE') {
      recordFailedLogin(rateKey)
      return NextResponse.json(
        { error: 'Those credentials do not match the selected account.' },
        { status: 401 },
      )
    }

    const userRole = user.role.toLowerCase() as SchoolRole
    if (userRole !== role) {
      recordFailedLogin(rateKey)
      return NextResponse.json(
        { error: 'Those credentials do not match the selected role.' },
        { status: 401 },
      )
    }

    const validPassword = await verifyPassword(password, user.passwordHash)
    if (!validPassword) {
      recordFailedLogin(rateKey)
      return NextResponse.json(
        { error: 'Those credentials do not match the selected account.' },
        { status: 401 },
      )
    }

    clearLoginRateLimit(rateKey)

    const csrfToken = generateCsrfToken()
    const sessionToken = await signSessionToken(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        initials: user.initials,
        role: userRole,
        csrfToken,
      },
      remember,
    )

    const redirectTo = `/${userRole}/${
      userRole === 'admin' ? 'dashboard' : userRole === 'teacher' ? 'today' : 'home'
    }`

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      afterSummary: `Signed in as ${user.role} (${user.email})`,
    })

    const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 60 * 12
    const response = NextResponse.json({
      role: userRole,
      redirectTo,
      csrfToken,
      sessionToken,
      user: {
        id: user.id,
        role: userRole,
        name: user.name,
        email: user.email,
        initials: user.initials,
      },
    })

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    response.cookies.set(ROLE_COOKIE_NAME, userRole, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 })
  }
}
