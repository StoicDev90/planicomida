import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { errorResponse, json, parseBody } from '@/lib/http';

const Body = z.object({ title: z.string().min(1), qty: z.number().positive() });

function post(body: string) {
  return new Request('http://localhost/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('json', () => {
  it('serializa con status y content-type', async () => {
    const res = json({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(await res.json()).toEqual({ ok: true });
  });

  it('usa 200 por defecto', () => {
    expect(json({}).status).toBe(200);
  });
});

describe('errorResponse', () => {
  it('usa la forma de error común', async () => {
    const res = errorResponse(404, 'NOT_FOUND', 'No existe');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'No existe' } });
  });

  it('incluye fields si se pasan', async () => {
    const res = errorResponse(400, 'VALIDATION', 'Datos inválidos', { title: 'Requerido' });
    expect((await res.json()).error.fields).toEqual({ title: 'Requerido' });
  });
});

describe('parseBody', () => {
  it('devuelve los datos validados', async () => {
    const result = await parseBody(post('{"title":"Tarta","qty":2}'), Body);
    expect(result).toEqual({ ok: true, data: { title: 'Tarta', qty: 2 } });
  });

  it('responde 400 VALIDATION si el JSON está roto', async () => {
    const result = await parseBody(post('{"title":'), Body);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    expect((await result.response.json()).error.code).toBe('VALIDATION');
  });

  it('responde 400 con fields por campo si no pasa zod', async () => {
    const result = await parseBody(post('{"title":"","qty":-1}'), Body);
    if (result.ok) throw new Error('debería fallar');
    const { error } = await result.response.json();
    expect(error.code).toBe('VALIDATION');
    expect(Object.keys(error.fields).sort()).toEqual(['qty', 'title']);
  });

  it('usa la ruta completa para campos anidados y se queda con el primer error', async () => {
    const Nested = z.object({ items: z.array(z.object({ name: z.string().min(2).max(1) })) });
    const result = await parseBody(post('{"items":[{"name":"a"}]}'), Nested);
    if (result.ok) throw new Error('debería fallar');
    const { error } = await result.response.json();
    expect(Object.keys(error.fields)).toEqual(['items.0.name']);
  });

  it('usa "_" para errores sin campo', async () => {
    const result = await parseBody(post('[]'), Body);
    if (result.ok) throw new Error('debería fallar');
    const { error } = await result.response.json();
    expect(error.fields).toHaveProperty('_');
  });
});
