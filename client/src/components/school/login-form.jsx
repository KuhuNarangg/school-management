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
} from 'lucide-react'
import { demoCredentials } from '@/lib/api/school'

const roleOptions = [
  {
    role: 'admin',
    title: 'Administrator',
    sub: 'School leadership',
    icon: ShieldCheck,
    accent: '#4f46e5',
    bgWeak: '#eef2ff',
  },
  {
    role: 'teacher',
    title: 'Teacher',
    sub: 'Classroom studio',
    icon: BookOpen,
    accent: '#0d9488',
    bgWeak: '#f0fdfa',
  },
  {
    role: 'guardian',
    title: 'Guardian',
    sub: 'Family portal',
    icon: HeartHandshake,
    accent: '#0284c7',
    bgWeak: '#f0f9ff',
  },
]

const labels = {
  admin: 'Administrator',
  teacher: 'Teacher',
  guardian: 'Guardian',
}

const shortLabels = {
  admin: 'Admin',
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

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          email: email.trim(),
          password,
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
            <GraduationCap size={20} />
          </span>
          <span>
            northstar<span>.</span>
          </span>
        </Link>

        <div className="login-brand-copy">
          <span className="login-kicker">
            <Sparkles size={13} /> YOUR SCHOOL, IN SYNC
          </span>
          <h1>Good things happen when everyone’s connected.</h1>
          <p>A calm, unified workspace for administrators, teachers, and families.</p>
        </div>

        <div className="login-brand-bottom">
          <span>
            <Check size={15} /> Northstar Academy · Springfield, IL
          </span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-panel-topbar">
            <Link href="/" className="login-back">
              <ArrowLeft size={14} /> Back
            </Link>
            <div className="login-mobile-brand-tag">
              <span className="home-brand-icon-sm">
                <GraduationCap size={15} />
              </span>
              <span className="login-brand-name">
                northstar<span>.</span>
              </span>
            </div>
            <span
              className="login-active-pill"
              style={{ background: activeRoleMeta.bgWeak, color: activeRoleMeta.accent }}
            >
              <span className="login-pill-role-full">{labels[role]}</span>
              <span className="login-pill-role-short">{shortLabels[role]}</span>
              <span className="login-pill-portal"> Portal</span>
            </span>
          </div>

          <div className="login-heading">
            <h2>Welcome back</h2>
            <p>Choose your role and sign in to your workspace.</p>
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
                          boxShadow: `0 0 0 2px ${accent}24`,
                        }
                      : undefined
                  }
                  aria-pressed={isSelected}
                  onClick={() => selectRole(option)}
                >
                  <span
                    className="login-role-icon"
                    style={
                      isSelected
                        ? { background: accent, color: '#ffffff' }
                        : { background: '#f1f5f9', color: '#475569' }
                    }
                  >
                    <Icon size={17} />
                  </span>
                  <span className="login-role-copy">
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </span>
                </button>
              )
            })}
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setError('Use the demo credentials below to sign in.')}
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
                  <span className="login-spinner" /> Signing you in...
                </>
              ) : (
                <>
                  Continue to workspace <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="demo-box" role="region" aria-label="Demo credentials">
            <div className="demo-box-header">
              <div className="demo-box-badge-group">
                <span className="demo-badge">DEMO</span>
                <span className="demo-hint-text">Instant test access</span>
              </div>
              <button
                type="button"
                className="demo-fill"
                onClick={fillDemo}
                title="Fill demo credentials into form"
              >
                <Sparkles size={12} /> Auto-fill
              </button>
            </div>
            <div className="demo-values">
              <div className="demo-cred-pill" title={demoCredentials[role].email}>
                <span className="demo-cred-key">Email</span>
                <code>{demoCredentials[role].email}</code>
              </div>
              <div className="demo-cred-pill">
                <span className="demo-cred-key">Pass</span>
                <code>{demoCredentials[role].password}</code>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
