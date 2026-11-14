import { describe, it, expect } from 'vitest'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { GET as meGet } from '@/app/api/auth/me/route'

function makeLoginRequest(body: unknown) {
  return new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000', origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  })
}

function extractSessionCookie(res: Response): string {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || '']
  return raw.map((c) => c.split(';')[0]).join('; ')
}

describe('Phase 1: Authentication & RBAC Foundation', () => {
  it('logs in admin, teacher, and guardian with real DB credentials and returns signed session', async () => {
    for (const role of ['admin', 'teacher', 'guardian'] as const) {
      const res = await loginPost(
        makeLoginRequest({
          role,
          email: `${role}@school.demo`,
          password: 'Demo@1234',
          remember: true,
        }),
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.role).toBe(role)
      expect(data.user.email).toBe(`${role}@school.demo`)

      const cookie = extractSessionCookie(res)
      expect(cookie).toContain('northstar-session=')

      const meRes = await meGet(
        new Request('http://localhost:3000/api/auth/me', {
          headers: { cookie },
        }),
      )
      expect(meRes.status).toBe(200)
      const meData = await meRes.json()
      expect(meData.user.role).toBe(role)
      if (role === 'guardian') {
        expect(meData.children.length).toBe(2)
      }
      if (role === 'teacher') {
        expect(meData.assignedStudents.length).toBeGreaterThan(0)
      }
    }
  })

  it('rejects wrong role mismatch or invalid password with 401', async () => {
    const wrongRoleRes = await loginPost(
      makeLoginRequest({
        role: 'admin',
        email: 'teacher@school.demo',
        password: 'Demo@1234',
      }),
    )
    expect(wrongRoleRes.status).toBe(401)

    const wrongPassRes = await loginPost(
      makeLoginRequest({
        role: 'admin',
        email: 'admin@school.demo',
        password: 'WrongPassword123!',
      }),
    )
    expect(wrongPassRes.status).toBe(401)
  })

  it('returns 401 when accessing /api/auth/me without a session', async () => {
    const res = await meGet(new Request('http://localhost:3000/api/auth/me'))
    expect(res.status).toBe(401)
  })
})
