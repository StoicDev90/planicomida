import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, setDb, type Db } from '@/lib/db';
import { POST as register } from '@/pages/api/auth/register';
import { POST as login } from '@/pages/api/auth/login';
import { apiContext } from '../helpers/api';

let db: Db;
beforeEach(() => {
  db = createTestDb();
  setDb(db);
});
afterEach(() => setDb(undefined));

const ANA = { email: 'ana@mail.com', name: 'Ana', password: 'secreta123' };

describe('POST /api/auth/register', () => {
  it('crea el usuario, setea la cookie de sesión y responde 201', async () => {
    const { context, jar } = apiContext({
      path: '/api/auth/register',
      method: 'POST',
      body: ANA,
    });
    const res = await register(context);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      user: { id: 1, email: 'ana@mail.com', name: 'Ana' },
    });
    expect(jar.get('pc_session')?.value).toEqual(expect.any(String));
    expect(jar.get('pc_session')?.value).toHaveLength(43);
  });

  it('responde 409 CONFLICT si el email ya existe', async () => {
    const first = apiContext({ path: '/api/auth/register', method: 'POST', body: ANA });
    await register(first.context);

    const { context } = apiContext({ path: '/api/auth/register', method: 'POST', body: ANA });
    const res = await register(context);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('CONFLICT');
  });

  it('responde 400 VALIDATION con los campos inválidos', async () => {
    const { context } = apiContext({
      path: '/api/auth/register',
      method: 'POST',
      body: { email: 'x', name: '', password: '1' },
    });
    const res = await register(context);
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe('VALIDATION');
    expect(error.fields).toEqual(expect.objectContaining({ email: expect.any(String) }));
    expect(error.fields).toEqual(expect.objectContaining({ name: expect.any(String) }));
    expect(error.fields).toEqual(expect.objectContaining({ password: expect.any(String) }));
  });

  it('responde 400 si el cuerpo no es JSON válido', async () => {
    const { context } = apiContext({
      path: '/api/auth/register',
      method: 'POST',
      rawBody: '{roto',
    });
    const res = await register(context);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION', message: 'El cuerpo no es JSON válido' },
    });
  });
});

describe('POST /api/auth/login', () => {
  it('con credenciales correctas responde 200 y setea la cookie', async () => {
    const reg = apiContext({ path: '/api/auth/register', method: 'POST', body: ANA });
    await register(reg.context);

    const { context, jar } = apiContext({
      path: '/api/auth/login',
      method: 'POST',
      body: { email: ANA.email, password: ANA.password },
      ip: '10.0.0.1',
    });
    const res = await login(context);
    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe('ana@mail.com');
    expect(jar.get('pc_session')?.value).toEqual(expect.any(String));
  });

  it('con contraseña mala responde 401 sin cookie', async () => {
    const reg = apiContext({ path: '/api/auth/register', method: 'POST', body: ANA });
    await register(reg.context);

    const { context, jar } = apiContext({
      path: '/api/auth/login',
      method: 'POST',
      body: { email: ANA.email, password: 'otra-clave' },
      ip: '10.0.0.2',
    });
    const res = await login(context);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Email o contraseña incorrectos' },
    });
    expect(jar.has('pc_session')).toBe(false);
  });

  it('con email inexistente responde exactamente lo mismo que con contraseña mala', async () => {
    const { context, jar } = apiContext({
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'nadie@mail.com', password: 'secreta123' },
      ip: '10.0.0.3',
    });
    const res = await login(context);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Email o contraseña incorrectos' },
    });
    expect(jar.has('pc_session')).toBe(false);
  });

  it('tras 10 intentos fallidos desde la misma ip, el 11.º responde 429 RATE_LIMITED', async () => {
    const reg = apiContext({ path: '/api/auth/register', method: 'POST', body: ANA });
    await register(reg.context);

    const attempt = () => {
      const { context } = apiContext({
        path: '/api/auth/login',
        method: 'POST',
        body: { email: ANA.email, password: 'mala-clave' },
        ip: '10.0.0.4',
      });
      return login(context);
    };

    for (let i = 0; i < 10; i++) {
      expect((await attempt()).status).toBe(401);
    }
    const res = await attempt();
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe('RATE_LIMITED');
  });
});
