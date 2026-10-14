import { describe, expect, it } from 'vitest';
import { SESSION_COOKIE, clearSessionCookie, setSessionCookie } from '@/lib/session-cookie';
import { apiContext } from '../helpers/api';

describe('cookie de sesión', () => {
  it('setSessionCookie setea pc_session con HttpOnly, SameSite=Lax, Path=/ y Max-Age de 30 días', () => {
    const { context, jar } = apiContext({ path: '/' });
    setSessionCookie(
      context.cookies,
      'tok',
      new Date('2026-11-12T12:00:00Z'),
      new Date('2026-10-13T12:00:00Z'),
    );
    expect(jar.get('pc_session')).toEqual({
      value: 'tok',
      options: { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 2592000, secure: false },
    });
  });

  it('setSessionCookie con expiresAt en el pasado usa Max-Age 0', () => {
    const { context, jar } = apiContext({ path: '/' });
    setSessionCookie(
      context.cookies,
      'tok',
      new Date('2026-10-01T12:00:00Z'),
      new Date('2026-10-13T12:00:00Z'),
    );
    expect(jar.get('pc_session')?.options.maxAge).toBe(0);
  });

  it('clearSessionCookie borra la cookie', () => {
    const { context, jar } = apiContext({ path: '/' });
    clearSessionCookie(context.cookies);
    expect(jar.get('pc_session')).toBeNull();
  });

  it('SESSION_COOKIE vale pc_session', () => {
    expect(SESSION_COOKIE).toBe('pc_session');
  });
});
