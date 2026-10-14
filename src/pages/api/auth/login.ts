import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json } from '@/lib/http';
import { setSessionCookie } from '@/lib/session-cookie';
import { loginFlow } from '@/services/auth-flows';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, 'VALIDATION', 'El cuerpo no es JSON válido');
  }
  const result = await loginFlow(getDb(), raw, clientAddress);
  if (!result.ok) return errorResponse(result.status, result.code, result.message, result.fields);
  setSessionCookie(cookies, result.token, result.expiresAt);
  return json({ user: result.user }, 200);
};
