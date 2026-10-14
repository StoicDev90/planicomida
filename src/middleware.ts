import type { MiddlewareHandler } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '@/lib/session-cookie';
import { validateSession } from '@/services/auth';

const PUBLIC_API = new Set(['/api/auth/register', '/api/auth/login', '/api/health']);
const AUTH_PAGES = new Set(['/login', '/registro']);

function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  try {
    // Las páginas prerenderizadas (la landing) no tienen cookies ni sesión.
    if (context.isPrerendered) return await next();

    const { pathname, search } = context.url;
    const token = context.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      const session = validateSession(getDb(), token);
      if (session) {
        context.locals.user = session.user;
        if (session.renewed) setSessionCookie(context.cookies, token, session.expiresAt);
      } else {
        clearSessionCookie(context.cookies);
      }
    }

    const user = context.locals.user;
    if (!user && isAppPath(pathname)) {
      return context.redirect(`/login?next=${encodeURIComponent(pathname + search)}`, 302);
    }
    if (!user && pathname.startsWith('/api/') && !PUBLIC_API.has(pathname)) {
      return errorResponse(401, 'UNAUTHENTICATED', 'Tenés que iniciar sesión.');
    }
    if (user && AUTH_PAGES.has(pathname)) {
      return context.redirect('/app/planner', 302);
    }
    return await next();
  } catch (error) {
    // Fuera de la API, Astro muestra su página de error.
    if (!context.url.pathname.startsWith('/api/')) throw error;
    console.error(`[api] ${context.url.pathname}`, error);
    return errorResponse(500, 'INTERNAL', 'Ocurrió un error inesperado. Probá de nuevo.');
  }
};
