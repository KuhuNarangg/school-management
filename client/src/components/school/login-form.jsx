'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, EyeOff, GraduationCap, HeartHandshake, ShieldCheck, Sparkles, } from 'lucide-react';
import { demoCredentials } from '@/lib/api/school';
const roleOptions = [
    { role: 'admin', title: 'Administrator', sub: 'Manage your school', icon: ShieldCheck },
    { role: 'teacher', title: 'Teacher', sub: 'Your classroom workspace', icon: BookOpen },
    { role: 'guardian', title: 'Guardian', sub: 'Follow your child’s journey', icon: HeartHandshake },
];
const labels = {
    admin: 'Administrator',
    teacher: 'Teacher',
    guardian: 'Guardian',
};
export function LoginForm({ initialRole }) {
    const router = useRouter();
    const [role, setRole] = useState(initialRole);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        setRole(initialRole);
        setLoading(false);
        setError('');
    }, [initialRole]);
    useEffect(() => {
        const resetLoading = () => setLoading(false);
        window.addEventListener('pageshow', resetLoading);
        window.addEventListener('popstate', resetLoading);
        return () => {
            window.removeEventListener('pageshow', resetLoading);
            window.removeEventListener('popstate', resetLoading);
        };
    }, []);
    function selectRole(nextRole) {
        setRole(nextRole);
        setLoading(false);
        setError('');
        if (email && Object.values(demoCredentials).some((c) => c.email === email)) {
            setEmail(demoCredentials[nextRole].email);
            setPassword(demoCredentials[nextRole].password);
        }
    }
    function fillDemo() {
        setEmail(demoCredentials[role].email);
        setPassword(demoCredentials[role].password);
        setError('');
        setLoading(false);
    }
    async function submit(event) {
        event.preventDefault();
        setError('');
        if (!email.trim() || !password) {
            setError('Enter your email and password to continue.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Enter a valid email address.');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, email, password, remember }),
            });
            const payload = (await response.json());
            if (!response.ok || !payload.redirectTo) {
                setError(payload.error || 'We could not sign you in. Please try again.');
                setLoading(false);
                return;
            }
            if (payload.role) {
                document.cookie = `school-demo-role=${payload.role}; Path=/; SameSite=Lax`;
            }
            if (payload.csrfToken) {
                document.cookie = `northstar-csrf=${payload.csrfToken}; Path=/; SameSite=Lax`;
            }
            setLoading(false);
            router.push(payload.redirectTo);
        }
        catch {
            setError('We could not connect. Please try again in a moment.');
            setLoading(false);
        }
    }
    return (<main className="login-page">
      <section className="login-brand-panel">
        <Link href="/" className="home-brand">
          <span className="home-brand-icon">
            <GraduationCap size={20}/>
          </span>
          <span>
            northstar<span>.</span>
          </span>
        </Link>
        <div className="login-brand-copy">
          <span className="login-kicker">
            <Sparkles size={14}/> YOUR SCHOOL, IN SYNC
          </span>
          <h1>Good things happen when everyone’s connected.</h1>
          <p>A calm, thoughtful space for the people who make every school day count.</p>
          <div className="login-quote">
            <div className="quote-avatars">
              <span>AR</span>
              <span>OR</span>
              <span>JM</span>
            </div>
            <div>
              <strong>One school. Everyone included.</strong>
              <span>Admin · Teacher · Guardian</span>
            </div>
          </div>
        </div>
        <div className="login-brand-bottom">
          <span>
            <Check size={15}/> Designed for your school community
          </span>
          <span>Northstar Academy · Springfield</span>
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-mobile-brand">
          <Link href="/" className="home-brand">
            <span className="home-brand-icon">
              <GraduationCap size={20}/>
            </span>
            <span>
              northstar<span>.</span>
            </span>
          </Link>
        </div>
        <Link href="/" className="login-back">
          <ArrowLeft size={15}/> Back to home
        </Link>
        <div className="login-card">
          <div className="login-heading">
            <span className="login-step">
              STEP 1 OF 2 <span>·</span> YOUR ROLE
            </span>
            <h2>Welcome back</h2>
            <p>Choose your role, then sign in to your workspace.</p>
          </div>
          <div className="login-role-grid" role="group" aria-label="Choose your account role">
            {roleOptions.map(({ role: option, title, sub, icon: Icon }) => (<button type="button" key={option} className={`login-role ${role === option ? 'login-role-active' : ''}`} aria-pressed={role === option} onClick={() => selectRole(option)}>
                <span className="login-role-icon">
                  <Icon size={19}/>
                </span>
                <span className="login-role-copy">
                  <strong>{title}</strong>
                  <small>{sub}</small>
                </span>
                <span className="login-role-check">{role === option && <Check size={13}/>}</span>
              </button>))}
          </div>
          <div className="login-step-two">
            <span className="login-step">
              STEP 2 OF 2 <span>·</span> SIGN IN AS {labels[role].toUpperCase()}
            </span>
          </div>
          <form onSubmit={submit} noValidate>
            <label className="login-field">
              Email address
              <input type="email" name="email" autoComplete="username" placeholder="you@school.edu" value={email} onChange={(event) => {
            setEmail(event.target.value);
            if (loading)
                setLoading(false);
        }}/>
            </label>
            <label className="login-field">
              Password
              <span className="password-control">
                <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => {
            setPassword(event.target.value);
            if (loading)
                setLoading(false);
        }}/>
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </span>
            </label>
            <label className="remember-row">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/>
              <span>Remember me on this device</span>
              <button type="button" onClick={() => setError('For this demo, use the credentials listed below.')}>
                Forgot password?
              </button>
            </label>
            {error && (<div className="login-error" role="alert">
                {error}
              </div>)}
            <button className="login-submit" disabled={loading} type="submit">
              {loading ? (<>
                  <span className="login-spinner"/> Signing you in...
                </>) : (<>
                  Continue to workspace <ArrowRight size={16}/>
                </>)}
            </button>
          </form>
          <div className="demo-box">
            <div className="demo-box-heading">
              <div>
                <strong>Demo credentials</strong>
                <span>Try a guided preview of this role.</span>
              </div>
              <span className="demo-badge">DEMO</span>
            </div>
            <div className="demo-values">
              <span>{demoCredentials[role].email}</span>
              <span>Demo@1234</span>
            </div>
            <button type="button" className="demo-fill" onClick={fillDemo}>
              Fill automatically <ArrowRight size={14}/>
            </button>
          </div>
        </div>
        <p className="login-footer">
          Need access? <a href="mailto:hello@northstar.school">Contact your school administrator</a>
        </p>
      </section>
    </main>);
}
