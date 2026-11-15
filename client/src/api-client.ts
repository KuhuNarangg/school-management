const API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '')

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function installApiFetchInterceptor() {
  if (typeof window === 'undefined') return
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    const isApiCall = urlStr.startsWith('/api/') || urlStr === '/api'
    if (isApiCall && API_BASE) {
      urlStr = `${API_BASE}${urlStr}`
    }

    const nextInit: RequestInit = {
      ...init,
      credentials: init?.credentials || 'include',
    }

    if (isApiCall) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
      const csrfCookie = readCookie('northstar-csrf') || localStorage.getItem('northstar_csrf_token')
      if (csrfCookie && !headers.has('x-csrf-token')) {
        headers.set('x-csrf-token', csrfCookie)
      }
      // Attach Bearer token only when cross-origin API_BASE is used or cookie is present
      const storedToken = localStorage.getItem('northstar_session_token')
      if (storedToken && (API_BASE || readCookie('northstar-csrf')) && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${storedToken}`)
      }
      nextInit.headers = headers
    }

    const response = await originalFetch(urlStr, nextInit)

    if (urlStr.includes('/api/auth/login') && response.ok) {
      try {
        const cloned = response.clone()
        const data = await cloned.json()
        if (data?.sessionToken) {
          localStorage.setItem('northstar_session_token', data.sessionToken)
        }
        if (data?.csrfToken) {
          localStorage.setItem('northstar_csrf_token', data.csrfToken)
        }
        if (data?.role) {
          localStorage.setItem('northstar_role', data.role)
        }
      } catch {
        // ignore
      }
    } else if (urlStr.includes('/api/auth/logout')) {
      localStorage.removeItem('northstar_session_token')
      localStorage.removeItem('northstar_csrf_token')
      localStorage.removeItem('northstar_role')
    }

    return response
  }
}
