'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { demoCredentials } from '@/lib/api/school'

const roleOptions = [
  {
    role: 'admin',
    title: 'Administrator',
    sub: 'Manage school, staff & fees',
    icon: ShieldCheck,
    accent: '#4f46e5',
    bgWeak: '#eef2ff',
    badge: 'Full School Access',
  },
  {
    role: 'teacher',
    title: 'Teacher',
    sub: 'Classes, attendance & marks',
    icon: BookOpen,
    accent: '#0d9488',
    bgWeak: '#f0fdfa',
    badge: 'Classroom Portal',
  },
  {
    role: 'guardian',
    title: 'Guardian',
    sub: 'Child progress, results & fees',
    icon: HeartHandshake,
    accent: '#0284c7',
    bgWeak: '#f0f9ff',
    badge: 'Family Portal',
  },
]

const labels = {
  admin: 'Administrator',
  teacher: 'Teacher',
  guardian: 'Guardian',
}

export function LoginForm({ initialRole = 'admin' }) {
  const router = useRouter()
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState(demoCredentials[initialRole]?.email || '')
  const [password, setPassword] = useState(demoCredentials[initialRole]?.password || '')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const activeRoleMeta = roleOptions.find((r) => r.role === role) || roleOptions[0]

  useEffect(() => {
    setRole(initialRole)
    setEmail(demoCredentials[initialRole]?.email || '')
    setPassword(demoCredentials[initialRole]?.password || '')
    setLoading(false)
    setError('')
  }, [initialRole])

  useEffect(() => {
    const resetLoading = () => setLoading(false)
    window.addEventListener('pageshow', resetLoading)
    window.addEventListener('popstate', resetLoading)
    return () => {
      window.removeEventListener('pageshow', resetLoading)
      window.removeEventListener('popstate', resetLoading)
    }
  }, [])

  function selectRole(nextRole) {
    setRole(nextRole)
    setLoading(false)
    setError('')
    const isUsingDemoOrEmpty =
      !email.trim() || Object.values(demoCredentials).some((c) => c.email === email.trim())
    if (isUsingDemoOrEmpty && demoCredentials[nextRole]) {
      setEmail(demoCredentials[nextRole].email)
      setPassword(demoCredentials[nextRole].password)
    }
  }

  function fillDemo() {
    setEmail(demoCredentials[role].email)
    setPassword(demoCredentials[role].password)
    setError('')
    setLoading(false)
  }

  async function performLogin(targetRole, targetEmail, targetPassword) {
    setError('')
    if (!targetEmail.trim() || !targetPassword) {
      setError('Enter your email and password to continue.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          email: targetEmail.trim(),
          password: targetPassword,
          remember,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.redirectTo) {
        setError(payload.error || 'We could not sign you in. Please try again.')
        setLoading(false)
        return
      }
      if (payload.role) {
        document.cookie = `school-demo-role=${payload.role}; Path=/; SameSite=Lax`
      }
      if (payload.csrfToken) {
        document.cookie = `northstar-csrf=${payload.csrfToken}; Path=/; SameSite=Lax`
      }
      setLoading(false)
      router.push(payload.redirectTo)
    } catch {
      setError('We could not connect. Please try again in a moment.')
      setLoading(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    await performLogin(role, email, password)
  }

  async function quickSignInAs(targetRole) {
    setRole(targetRole)
    const creds = demoCredentials[targetRole]
    setEmail(creds.email)
    setPassword(creds.password)
    await performLogin(targetRole, creds.email, creds.password)
  }

  return (
    <main
      className="login-page"
      style={{
        '--login-accent': activeRoleMeta.accent,
        '--login-accent-weak': activeRoleMeta.bgWeak,
      }}
    >
      <section className="login-brand-panel">
        <Link href="/" className="home-brand">
          <span className="home-brand-icon">
            <GraduationCap size={22} />
          </span>
          <span>
            northstar<span>.</span>
          </span>
        </Link>

        <div className="login-brand-copy">
          <span className="login-kicker">
            <Sparkles size={14} /> YOUR SCHOOL, IN SYNC
          </span>
          <h1>Good things happen when everyone’s connected.</h1>
          <p>
            A calm, high-clarity workspace built for administrators, teachers, and families at
            Northstar Academy.
          </p>

          <div className="login-QuoteCard">
            <div className="login-quote">
              <div className="quote-avatars">
                <span>AR</span>
                <span>EV</span>
                <span>MR</span>
              </div>
              <div>
                <strong>One school. Everyone included.</strong>
                <span>Admin · Teacher · Guardian Portals</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-brand-bottom">
          <span>
            <Check size={16} /> Designed for your school community
          </span>
          <span>Northstar Academy · Springfield, IL</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-panel-topbar">
          <Link href="/" className="login-back">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <span className="login-active-pill" style={{ background: activeRoleMeta.bgWeak, color: activeRoleMeta.accent }}>
            {activeRoleMeta.badge}
          </span>
        </div>

        <div className="login-card">
          <div className="login-heading">
            <span className="login-step" style={{ color: activeRoleMeta.accent }}>
              STEP 1 OF 2 <span>·</span> SELECT PORTAL ROLE
            </span>
            <h2>Welcome back</h2>
            <p>Click a role below to switch portals — demo credentials fill automatically.</p>
          </div>

          <div className="login-role-grid" role="group" aria-label="Choose your account role">
            {roleOptions.map(({ role: option, title, sub, icon: Icon, accent, bgWeak }) => {
              const isSelected = role === option
              return (
                <button
                  type="button"
                  key={option}
                  className={`login-role ${isSelected ? 'login-role-active' : ''}`}
                  style={
                    isSelected
                      ? {
                          borderColor: accent,
                          background: bgWeak,
                          boxShadow: `0 0 0 2px ${accent}28`,
                        }
                      : undefined
                  }
                  aria-pressed={isSelected}
                  onClick={() => selectRole(option)}
                >
                  <div className="login-role-top">
                    <span
                      className="login-role-icon"
                      style={
                        isSelected
                          ? { background: accent, color: '#ffffff' }
                          : { background: '#f1f5f9', color: '#475569' }
                      }
                    >
                      <Icon size={20} />
                    </span>
                    <span
                      className="login-role-check"
                      style={
                        isSelected
                          ? { background: accent, color: '#ffffff', opacity: 1 }
                          : { background: '#e2e8f0', color: 'transparent', opacity: 0.5 }
                      }
                    >
                      <Check size={13} />
                    </span>
                  </div>
                  <span className="login-role-copy">
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="login-step-two">
            <span className="login-step" style={{ color: activeRoleMeta.accent }}>
              STEP 2 OF 2 <span>·</span> SIGN IN AS {labels[role].toUpperCase()}
            </span>
          </div>

          <form onSubmit={submit} noValidate>
            <label className="login-field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@school.edu"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (loading) setLoading(false)
                  if (error) setError('')
                }}
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <span className="password-control">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (loading) setLoading(false)
                    if (error) setError('')
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="remember-row">
              <label className="remember-check-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Remember me on this device</span>
              </label>
              <button
                type="button"
                onClick={() => setError('For this demo, use the credentials listed below.')}
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="login-submit"
              style={{ background: activeRoleMeta.accent }}
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <span className="login-spinner" /> Signing in to {labels[role]}...
                </>
              ) : (
                <>
                  Continue to workspace <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="demo-box">
            <div className="demo-box-heading">
              <div>
                <strong>Demo credentials ({labels[role]})</strong>
                <span>Click “Fill automatically” or launch any portal in 1 click below.</span>
              </div>
              <span className="demo-badge">LIVE DEMO</span>
            </div>

            <div className="demo-values">
              <span>{demoCredentials[role].email}</span>
              <span>{demoCredentials[role].password}</span>
              <button type="button" className="demo-fill" onClick={fillDemo}>
                Fill automatically <ArrowRight size={14} />
              </button>
            </div>

            <div className="instant-demo-row">
              <span className="instant-demo-label">
                <Zap size={13} /> Instant 1-click launch:
              </span>
              <div className="instant-demo-buttons">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickSignInAs('admin')}
                  className="instant-btn instant-btn-admin"
                >
                  Admin Portal
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickSignInAs('teacher')}
                  className="instant-btn instant-btn-teacher"
                >
                  Teacher Portal
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickSignInAs('guardian')}
                  className="instant-btn instant-btn-guardian"
                >
                  Guardian Portal
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="login-footer">
          Need access? <a href="mailto:hello@northstar.school">Contact your school administrator</a>
        </p>
      </section>
    </main>
  )
}
