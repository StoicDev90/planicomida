import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { clearSessionCookie, SESSION_COOKIE } from '@/lib/session-cookie';
import { deleteSession } from '@/services/auth';

export const POST: APIRoute = ({ request, cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(getDb(), token);
  clearSessionCookie(cookies);

  // El botón "Salir" de la NavBar es un formulario HTML: lo mandamos a la landing.
  const fromForm = request.headers
    .get('content-type')
    ?.includes('application/x-www-form-urlencoded');
  return fromForm ? redirect('/', 303) : new Response(null, { status: 204 });
};
