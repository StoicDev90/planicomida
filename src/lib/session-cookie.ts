import type { AstroCookies } from 'astro';

export const SESSION_COOKIE = 'pc_session';

/** Setea la cookie con HttpOnly, SameSite=Lax, Path=/, Max-Age hasta `expiresAt`, Secure solo en producción. */
export function setSessionCookie(
  cookies: AstroCookies,
  token: string,
  expiresAt: Date,
  now = new Date(),
): void {
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)),
    secure: import.meta.env.PROD,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
