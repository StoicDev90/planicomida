import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { createSession, validateSession } from '@/services/auth';
import { POST as logout } from '@/pages/api/auth/logout';
import { GET as me } from '@/pages/api/auth/me';
import { apiContext } from '../helpers/api';
import { createUser } from '../helpers/fixtures';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => setDb(undefined));

describe('POST /api/auth/logout', () => {
  it('borra la sesión y la cookie en un pedido JSON y responde 204', async () => {
    const user = createUser(db);
    const { token } = createSession(db, user.id);
    const { context, jar } = apiContext({
      path: '/api/auth/logout',
      method: 'POST',
      body: {},
      cookies: { pc_session: token },
    });

    const res = await logout(context);

    expect(res.status).toBe(204);
    expect(jar.get('pc_session')).toBeNull();
    expect(validateSession(db, token)).toBeNull();
  });

  it('desde un formulario redirige a / con 303', async () => {
    const user = createUser(db);
    const { token } = createSession(db, user.id);
    const { context, jar } = apiContext({
      path: '/api/auth/logout',
      method: 'POST',
      form: {},
      cookies: { pc_session: token },
    });

    const res = await logout(context);

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/');
    expect(jar.get('pc_session')).toBeNull();
    expect(validateSession(db, token)).toBeNull();
  });

  it('sin cookie responde 204 y no falla', async () => {
    const { context } = apiContext({ path: '/api/auth/logout', method: 'POST', body: {} });

    const res = await logout(context);

    expect(res.status).toBe(204);
  });
});

describe('GET /api/auth/me', () => {
  it('con usuario en el contexto responde 200 con el usuario', async () => {
    const user = createUser(db, 'ana@mail.com', 'Ana');
    const { context } = apiContext({ path: '/api/auth/me', user });

    const res = await me(context);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      user: { id: user.id, email: 'ana@mail.com', name: 'Ana' },
    });
  });

  it('sin usuario responde 401 UNAUTHENTICATED', async () => {
    const { context } = apiContext({ path: '/api/auth/me' });

    const res = await me(context);

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHENTICATED');
  });
});
