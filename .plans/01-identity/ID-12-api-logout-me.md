# ID-12 · Endpoints `POST /api/auth/logout` y `GET /api/auth/me`

- **Módulo:** identity · **Depende de:** ID-06, ID-10 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` líneas 49–57 (API) y 65 ("Salir" hace POST y redirige a `/`).
- `src/components/NavBar.astro` líneas 40–47 (el botón "Salir" es un `<form method="post" action="/api/auth/logout">`).

## Archivos
- Crear: `src/pages/api/auth/logout.ts`
- Crear: `src/pages/api/auth/me.ts`
- Crear: `tests/api/auth-session.test.ts`

## Contrato

### `src/pages/api/auth/logout.ts` (copiar tal cual)
```ts
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
```

### `src/pages/api/auth/me.ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { errorResponse, json } from '@/lib/http';

export const GET: APIRoute = ({ locals }) =>
  locals.user
    ? json({ user: locals.user })
    : errorResponse(401, 'UNAUTHENTICATED', 'Tenés que iniciar sesión.');
```

## Tests primero — `tests/api/auth-session.test.ts`
Setup estándar. Para tener una sesión real: `user = createUser(db)`, `{ token } = createSession(db, user.id)`.
1. logout JSON: `apiContext({ path: '/api/auth/logout', method: 'POST', body: {}, cookies: { pc_session: token } })` →
   204, `jar.get('pc_session') === null`, y `validateSession(db, token) === null`.
2. logout desde formulario: igual pero con `form: {}` → 303 con `Location: '/'`.
3. logout sin cookie → 204 (no falla).
4. me con `user` en el contexto → 200 `{ user: { id, email: 'ana@mail.com', name: 'Ana' } }`.
5. me sin `user` → 401 con `error.code === 'UNAUTHENTICATED'`.

## Verificación
```bash
npx vitest run tests/api/auth-session.test.ts
npx vitest run
npm run check
# Con el servidor levantado (cookie de /tmp/pc.txt, ver README "páginas con sesión"):
curl -s -b /tmp/pc.txt http://localhost:4321/api/auth/me        # → {"user":{...}}
curl -s -i -b /tmp/pc.txt -c /tmp/pc.txt -X POST -H 'Origin: http://localhost:4321' \
  -H 'Content-Type: application/json' -d '{}' http://localhost:4321/api/auth/logout | head -1   # → 204
curl -s -b /tmp/pc.txt http://localhost:4321/api/auth/me        # → 401
```

## Hecho cuando
- [ ] Los 5 casos pasan y los `curl` dan 200 → 204 → 401.

## Commit
`feat(identity): ID-12 endpoints de logout y me`
