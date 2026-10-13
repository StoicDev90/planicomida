import type { APIContext, MiddlewareNext } from 'astro';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '@/middleware';

function context(path: string) {
  return { url: new URL(`http://localhost${path}`) } as APIContext;
}

const throwing: MiddlewareNext = () => Promise.reject(new Error('detalle interno secreto'));

afterEach(() => vi.restoreAllMocks());

describe('middleware de errores', () => {
  it('convierte una excepción en /api/** en 500 INTERNAL sin filtrar detalles', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = (await onRequest(context('/api/algo'), throwing)) as Response;

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({
      error: { code: 'INTERNAL', message: 'Ocurrió un error inesperado. Probá de nuevo.' },
    });
    expect(body).not.toContain('secreto');
    expect(log).toHaveBeenCalled();
  });

  it('deja pasar las respuestas normales', async () => {
    const ok = new Response('hola');
    const res = await onRequest(context('/api/algo'), () => Promise.resolve(ok));
    expect(res).toBe(ok);
  });

  it('fuera de /api/** relanza para que Astro muestre su página de error', async () => {
    await expect(onRequest(context('/app/planner'), throwing)).rejects.toThrow('secreto');
  });
});
