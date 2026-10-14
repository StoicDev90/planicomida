import { describe, expect, it } from 'vitest';
import { createTestDb, getDb, setDb } from '@/lib/db';
import { apiContext } from './api';

describe('apiContext', () => {
  it('parsea path y query', () => {
    const { context } = apiContext({ path: '/api/x?a=1' });
    expect(context.url.pathname).toBe('/api/x');
    expect(context.url.searchParams.get('a')).toBe('1');
  });

  it('envía body como JSON', async () => {
    const { context } = apiContext({ path: '/api/x', method: 'POST', body: { a: 1 } });
    expect(await context.request.json()).toEqual({ a: 1 });
    expect(context.request.headers.get('Content-Type')).toBe('application/json');
  });

  it('envía form urlencoded', async () => {
    const { context } = apiContext({
      path: '/api/x',
      method: 'POST',
      form: { email: 'a@b.com' },
    });
    expect((await context.request.formData()).get('email')).toBe('a@b.com');
  });

  it('maneja cookies entrantes y borradas', () => {
    const { context, jar } = apiContext({ path: '/', cookies: { pc_session: 'abc' } });
    expect(context.cookies.get('pc_session')?.value).toBe('abc');
    context.cookies.delete('pc_session');
    expect(context.cookies.get('pc_session')).toBeUndefined();
    expect(jar.get('pc_session')).toBeNull();
  });

  it('registra cookies seteadas', () => {
    const { context, jar } = apiContext({ path: '/' });
    context.cookies.set('x', '1', { path: '/' });
    expect(jar.get('x')).toEqual({ value: '1', options: { path: '/' } });
  });

  it('redirect', () => {
    const { context } = apiContext({ path: '/' });
    const res = context.redirect('/login', 303);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/login');
  });

  it('locals.user', () => {
    expect(apiContext({ path: '/' }).context.locals.user).toBeUndefined();
    const user = { id: 1, email: 'a@b.com', name: 'A' };
    expect(apiContext({ path: '/', user }).context.locals.user).toEqual(user);
  });
});

describe('setDb', () => {
  it('reemplaza la conexión única', () => {
    const db = createTestDb();
    setDb(db);
    expect(getDb()).toBe(db);
    setDb(undefined);
  });
});
