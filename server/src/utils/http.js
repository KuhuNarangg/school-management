function serializeCookie(name, value, opts = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    parts.push(`Path=${opts.path || '/'}`);
    if (opts.maxAge !== undefined)
        parts.push(`Max-Age=${opts.maxAge}`);
    if (opts.httpOnly)
        parts.push('HttpOnly');
    if (opts.secure)
        parts.push('Secure');
    if (opts.sameSite) {
        const s = opts.sameSite.charAt(0).toUpperCase() + opts.sameSite.slice(1);
        parts.push(`SameSite=${s}`);
    }
    return parts.join('; ');
}
export class AppResponse extends Response {
    cookies = {
        set: (name, value, opts = {}) => {
            this.headers.append('Set-Cookie', serializeCookie(name, value, opts));
        },
        delete: (name) => {
            this.headers.append('Set-Cookie', serializeCookie(name, '', { path: '/', maxAge: 0 }));
        },
    };
    static json(data, init) {
        const headers = new Headers(init?.headers);
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json; charset=utf-8');
        }
        return new AppResponse(JSON.stringify(data), {
            ...init,
            headers,
        });
    }
    static redirect(url, init = 302) {
        const status = typeof init === 'number' ? init : init?.status ?? 302;
        const headers = new Headers(typeof init === 'object' ? init?.headers : undefined);
        headers.set('Location', String(url));
        return new AppResponse(null, { status, headers });
    }
}
export const NextResponse = AppResponse;
