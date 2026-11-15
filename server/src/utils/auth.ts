import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { NextRequest } from './http'
import { prisma } from './prisma'
import type { SchoolRole } from '../types'

export const SESSION_COOKIE_NAME = 'northstar-session'
export const ROLE_COOKIE_NAME = 'school-demo-role'
export const CSRF_COOKIE_NAME = 'northstar-csrf'

export type SessionPayload = {
  userId: string
  email: string
  name: string
  initials: string
  role: SchoolRole
  csrfToken: string
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'northstar-school-super-secret-jwt-key-2026-production-grade'
  return new TextEncoder().encode(secret)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function signSessionToken(payload: SessionPayload, remember = true): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(remember ? '7d' : '12h')
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (
      typeof payload.userId === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.name === 'string' &&
      typeof payload.initials === 'string' &&
      (payload.role === 'admin' || payload.role === 'teacher' || payload.role === 'guardian') &&
      typeof payload.csrfToken === 'string'
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        initials: payload.initials,
        role: payload.role,
        csrfToken: payload.csrfToken,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  return null
}

export async function getRequestSession(request?: Request | NextRequest): Promise<SessionPayload | null> {
  if (request) {
    let rawToken: string | null = null
    const authHeader = request.headers.get('authorization') || ''
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      rawToken = authHeader.slice(7).trim()
    }
    if (!rawToken) {
      const cookieHeader = request.headers.get('cookie') || ''
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`))
      if (match?.[1]) {
        rawToken = decodeURIComponent(match[1])
      }
    }
    if (rawToken) {
      const payload = await verifySessionToken(rawToken)
      if (!payload) return null
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, status: true, role: true, name: true, email: true, initials: true },
      })
      if (!dbUser || dbUser.status !== 'ACTIVE') return null
      const dbRole = dbUser.role.toLowerCase() as SchoolRole
      if (dbRole !== payload.role) return null
      return {
        ...payload,
        name: dbUser.name,
        email: dbUser.email,
        initials: dbUser.initials,
        role: dbRole,
      }
    }
  }
  return getServerSession()
}

// Login Rate Limiter (sliding window in memory per key)
type RateRecord = { attempts: number; resetAt: number }
const loginAttempts = new Map<string, RateRecord>()
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000 // 10 minutes

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record || record.resetAt <= now) {
    return { allowed: true, retryAfterSeconds: 0 }
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

export function recordFailedLogin(key: string): void {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { attempts: 1, resetAt: now + WINDOW_MS })
  } else {
    record.attempts += 1
  }
}

export function clearLoginRateLimit(key: string): void {
  loginAttempts.delete(key)
}
