import type { APIRoute } from 'astro';
import { errorResponse, json } from '@/lib/http';

export const GET: APIRoute = ({ locals }) =>
  locals.user
    ? json({ user: locals.user })
    : errorResponse(401, 'UNAUTHENTICATED', 'Tenés que iniciar sesión.');
