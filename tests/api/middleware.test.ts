import type { MiddlewareNext } from 'astro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { onRequest } from '@/middleware';
import { createSession, hashToken } from '@/services/auth';
import { apiContext } from '../helpers/api';
import { createUser } from '../helpers/fixtures';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => {
  setDb(undefined);
  vi.restoreAllMocks();
});

const ok: MiddlewareNext = () => Promise.resolve(new Response('ok'));
const throwing: MiddlewareNext = () => Promise.reject(new Error('detalle interno secreto'));

// helper para una sesión real:
function loggedIn() {
  const user = createUser(db);
  const { token } = createSession(db, user.id);
  return { user, cookies: { pc_session: token } };
}

describe('middleware de sesión', () => {
  it('sin cookie, /app/planner redirige a /login con next', async () => {
    const { context } = apiContext({ path: '/app/planner' });
    const res = (await onRequest(context, ok)) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/login?next=%2Fapp%2Fplanner');
  });

  it('sin cookie, /app/lista con query conserva la query en next', async () => {
    const { context } = apiContext({ path: '/app/lista?semana=2026-10-12' });
    const res = (await onRequest(context, ok)) as Response;

    expect(res.headers.get('Location')).toBe('/login?next=%2Fapp%2Flista%3Fsemana%3D2026-10-12');
  });

  it('sin cookie, /api/recipes responde 401 UNAUTHENTICATED', async () => {
    const { context } = apiContext({ path: '/api/recipes' });
    const res = (await onRequest(context, ok)) as Response;

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Tenés que iniciar sesión.' },
    });
  });

  it('sin cookie, las rutas públicas de la API pasan', async () => {
    for (const path of ['/api/health', '/api/auth/login', '/api/auth/register']) {
      const { context } = apiContext({ path });
      const res = (await onRequest(context, ok)) as Response;
      expect(await res.text(), path).toBe('ok');
    }
  });

  it('sin cookie, / y /login pasan', async () => {
    for (const path of ['/', '/login']) {
      const { context } = apiContext({ path });
      const res = (await onRequest(context, ok)) as Response;
      expect(await res.text(), path).toBe('ok');
    }
  });

  it('con sesión válida, /app/planner pasa y carga locals.user', async () => {
    const { user, cookies } = loggedIn();
    const { context } = apiContext({ path: '/app/planner', cookies });
    const res = (await onRequest(context, ok)) as Response;

    expect(await res.text()).toBe('ok');
    expect(context.locals.user).toEqual({ id: user.id, email: 'ana@mail.com', name: 'Ana' });
  });

  it('con sesión válida, /login y /registro redirigen a /app/planner', async () => {
    const { cookies } = loggedIn();
    for (const path of ['/login', '/registro']) {
      const { context } = apiContext({ path, cookies });
      const res = (await onRequest(context, ok)) as Response;
      expect(res.status, path).toBe(302);
      expect(res.headers.get('Location'), path).toBe('/app/planner');
    }
  });

  it('cookie con token inventado redirige a login y borra la cookie', async () => {
    const { context, jar } = apiContext({
      path: '/app/planner',
      cookies: { pc_session: 'token-inventado' },
    });
    const res = (await onRequest(context, ok)) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/login?next=%2Fapp%2Fplanner');
    expect(jar.get('pc_session')).toBeNull();
  });

  it('sesión por vencer se renueva y se re-setea la cookie', async () => {
    const user = createUser(db);
    db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
      hashToken('t1'),
      user.id,
      new Date(Date.now() + 5 * 864e5).toISOString(),
    );
    const { context, jar } = apiContext({ path: '/app/planner', cookies: { pc_session: 't1' } });
    const res = (await onRequest(context, ok)) as Response;

    expect(await res.text()).toBe('ok');
    expect(jar.get('pc_session')?.value).toBe('t1');
  });

  it('excepción en /api con sesión responde 500 INTERNAL sin filtrar el detalle', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { cookies } = loggedIn();
    const { context } = apiContext({ path: '/api/algo', cookies });
    const res = (await onRequest(context, throwing)) as Response;

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({
      error: { code: 'INTERNAL', message: 'Ocurrió un error inesperado. Probá de nuevo.' },
    });
    expect(body).not.toContain('secreto');
    expect(log).toHaveBeenCalled();
  });

  it('excepción en /app con sesión se relanza para la página de error de Astro', async () => {
    const { cookies } = loggedIn();
    const { context } = apiContext({ path: '/app/planner', cookies });
    await expect(onRequest(context, throwing)).rejects.toThrow(/secreto/);
  });

  it('una página prerenderizada pasa sin cookie', async () => {
    const { context } = apiContext({ path: '/app/planner' });
    (context as { isPrerendered: boolean }).isPrerendered = true;
    const res = (await onRequest(context, ok)) as Response;

    expect(await res.text()).toBe('ok');
  });
});
