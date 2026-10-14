import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db } from '@/lib/db';
import { createRateLimiter, type RateLimiter } from '@/lib/rate-limit';
import { loginFlow, registerFlow } from '@/services/auth-flows';

let db: Db;
let limiter: RateLimiter;

beforeEach(() => {
  db = createTestDb();
  limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
});

const valid = { email: 'Ana@Mail.com', name: 'Ana', password: 'secreta123' };
const countSessions = () =>
  (db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n;

describe('registerFlow', () => {
  it('registra, normaliza el email y crea una sesión', async () => {
    const res = await registerFlow(db, valid);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.user.email).toBe('ana@mail.com');
    expect(typeof res.token).toBe('string');
    expect(countSessions()).toBe(1);
  });

  it('devuelve 409 CONFLICT si el email ya existe (sin distinguir mayúsculas ni espacios)', async () => {
    await registerFlow(db, valid);
    const res = await registerFlow(db, { ...valid, email: ' ANA@mail.com ' });
    expect(res).toMatchObject({ ok: false, status: 409, code: 'CONFLICT' });
    if (res.ok) return;
    expect(res.fields?.email).toBeDefined();
  });

  it('devuelve 400 con un error por cada campo inválido', async () => {
    const res = await registerFlow(db, { email: 'no-es-email', name: '', password: '123' });
    expect(res).toMatchObject({ ok: false, status: 400, code: 'VALIDATION' });
    if (res.ok) return;
    expect(Object.keys(res.fields ?? {}).sort()).toEqual(['email', 'name', 'password']);
  });

  it('devuelve 400 con el mensaje del email si el body está vacío', async () => {
    const res = await registerFlow(db, {});
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.status).toBe(400);
    expect(res.fields?.email).toBe('Ingresá tu email');
  });
});

describe('loginFlow', () => {
  const ip = '1.1.1.1';

  it('login correcto devuelve ok con la sesión creada', async () => {
    await registerFlow(db, valid);
    const res = await loginFlow(
      db,
      { email: 'ANA@mail.com', password: 'secreta123' },
      ip,
      new Date(),
      limiter,
    );
    expect(res.ok).toBe(true);
  });

  it('contraseña mala devuelve 401 con mensaje genérico', async () => {
    await registerFlow(db, valid);
    const res = await loginFlow(
      db,
      { email: valid.email, password: 'otra-clave' },
      ip,
      new Date(),
      limiter,
    );
    expect(res).toMatchObject({
      ok: false,
      status: 401,
      message: 'Email o contraseña incorrectos',
    });
  });

  it('email inexistente devuelve exactamente lo mismo que una contraseña mala', async () => {
    await registerFlow(db, valid);
    const wrongPassword = await loginFlow(
      db,
      { email: valid.email, password: 'otra-clave' },
      ip,
      new Date(),
      limiter,
    );
    const unknownEmail = await loginFlow(
      db,
      { email: 'nadie@mail.com', password: 'secreta123' },
      ip,
      new Date(),
      limiter,
    );
    expect(unknownEmail).toMatchObject({
      ok: false,
      status: wrongPassword.ok ? undefined : wrongPassword.status,
      message: wrongPassword.ok ? undefined : wrongPassword.message,
    });
  });

  it('después de 3 fallos bloquea con 429 aunque la contraseña sea correcta', async () => {
    await registerFlow(db, valid);
    const bad = { email: valid.email, password: 'otra-clave' };
    for (let i = 0; i < 3; i++) await loginFlow(db, bad, ip, new Date(), limiter);
    const res = await loginFlow(
      db,
      { email: valid.email, password: valid.password },
      ip,
      new Date(),
      limiter,
    );
    expect(res).toMatchObject({ ok: false, status: 429, code: 'RATE_LIMITED' });
  });

  it('un login exitoso olvida los fallos previos', async () => {
    await registerFlow(db, valid);
    const bad = { email: valid.email, password: 'otra-clave' };
    const good = { email: valid.email, password: valid.password };
    await loginFlow(db, bad, ip, new Date(), limiter);
    await loginFlow(db, bad, ip, new Date(), limiter);
    expect((await loginFlow(db, good, ip, new Date(), limiter)).ok).toBe(true);
    await loginFlow(db, bad, ip, new Date(), limiter);
    await loginFlow(db, bad, ip, new Date(), limiter);
    expect((await loginFlow(db, good, ip, new Date(), limiter)).ok).toBe(true);
  });

  it('borra las sesiones vencidas al iniciar sesión', async () => {
    const reg = await registerFlow(db, valid);
    if (!reg.ok) throw new Error('setup falló');
    db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
      'expirada',
      reg.user.id,
      '2000-01-01T00:00:00.000Z',
    );
    await loginFlow(db, { email: valid.email, password: valid.password }, ip, new Date(), limiter);
    const row = db.prepare("SELECT id FROM sessions WHERE id = 'expirada'").get();
    expect(row).toBeUndefined();
  });

  it('sin password devuelve 400 con fields.password', async () => {
    const res = await loginFlow(db, { email: 'ana@mail.com' }, ip, new Date(), limiter);
    expect(res).toMatchObject({ ok: false, status: 400, code: 'VALIDATION' });
    if (res.ok) return;
    expect(res.fields?.password).toBeDefined();
  });
});
