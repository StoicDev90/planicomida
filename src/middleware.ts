import type { MiddlewareHandler } from 'astro';
import { errorResponse } from '@/lib/http';

export const onRequest: MiddlewareHandler = async (context, next) => {
  try {
    return await next();
  } catch (error) {
    // Fuera de la API, Astro muestra su página de error.
    if (!context.url.pathname.startsWith('/api/')) throw error;
    console.error(`[api] ${context.url.pathname}`, error);
    return errorResponse(500, 'INTERNAL', 'Ocurrió un error inesperado. Probá de nuevo.');
  }
};
