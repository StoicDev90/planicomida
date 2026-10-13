# ID-09 · Middleware: sesión, protección de rutas y redirecciones

- **Módulo:** identity · **Depende de:** ID-05, ID-06, ID-08 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-identity.md` líneas 41–45 (reglas del middleware) y 72–76 (Success Criteria).
- `src/middleware.ts` (actual, ~15 líneas) y `tests/api/middleware.test.ts` (actual).

## Archivos
- Modificar: `src/middleware.ts` (reemplazar completo por el código de abajo)
- Modificar: `tests/api/middleware.test.ts` (reescribir completo con los casos de abajo)

## Contrato — `src/middleware.ts` (copiar tal cual)
```ts
import type { MiddlewareHandler } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '@/lib/session-cookie';
import { validateSession } from '@/services/auth';

const PUBLIC_API = new Set(['/api/auth/register', '/api/auth/login', '/api/health']);
const AUTH_PAGES = new Set(['/login', '/registro']);

function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  try {
    // Las páginas prerenderizadas (la landing) no tienen cookies ni sesión.
    if (context.isPrerendered) return await next();

    const { pathname, search } = context.url;
    const token = context.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      const session = validateSession(getDb(), token);
      if (session) {
        context.locals.user = session.user;
        if (session.renewed) setSessionCookie(context.cookies, token, session.expiresAt);
      } else {
        clearSessionCookie(context.cookies);
      }
    }

    const user = context.locals.user;
    if (!user && isAppPath(pathname)) {
      return context.redirect(`/login?next=${encodeURIComponent(pathname + search)}`, 302);
    }
    if (!user && pathname.startsWith('/api/') && !PUBLIC_API.has(pathname)) {
      return errorResponse(401, 'UNAUTHENTICATED', 'Tenés que iniciar sesión.');
    }
    if (user && AUTH_PAGES.has(pathname)) {
      return context.redirect('/app/planner', 302);
    }
    return await next();
  } catch (error) {
    // Fuera de la API, Astro muestra su página de error.
    if (!context.url.pathname.startsWith('/api/')) throw error;
    console.error(`[api] ${context.url.pathname}`, error);
    return errorResponse(500, 'INTERNAL', 'Ocurrió un error inesperado. Probá de nuevo.');
  }
};
```

## Tests primero — `tests/api/middleware.test.ts` (reescribir completo)
Setup:
```ts
let db: Db;
beforeEach(() => { db = createTestDb(); setDb(db); });
afterEach(() => { setDb(undefined); vi.restoreAllMocks(); });
const ok: MiddlewareNext = () => Promise.resolve(new Response('ok'));
const throwing: MiddlewareNext = () => Promise.reject(new Error('detalle interno secreto'));
// helper para una sesión real:
function loggedIn() {
  const user = createUser(db);
  const { token } = createSession(db, user.id);
  return { user, cookies: { pc_session: token } };
}
```
Llamar siempre `await onRequest(context, next)` con `context` de `apiContext(...)`.

1. Sin cookie, `path: '/app/planner'` → status 302, `Location` = `/login?next=%2Fapp%2Fplanner`.
2. Sin cookie, `path: '/app/lista?semana=2026-10-12'` → `Location` = `/login?next=%2Fapp%2Flista%3Fsemana%3D2026-10-12`.
3. Sin cookie, `path: '/api/recipes'` → 401 y body `{ error: { code: 'UNAUTHENTICATED', message: 'Tenés que iniciar sesión.' } }`.
4. Sin cookie, `/api/health`, `/api/auth/login` y `/api/auth/register` → pasan (`await res.text() === 'ok'`).
5. Sin cookie, `/` y `/login` → pasan.
6. Con sesión válida (`loggedIn()`), `/app/planner` → pasa y `context.locals.user` es `{ id, email: 'ana@mail.com', name: 'Ana' }`.
7. Con sesión válida, `/login` y `/registro` → 302 a `/app/planner`.
8. Cookie con token inventado → `/app/planner` da 302 a login y `jar.get('pc_session') === null` (cookie borrada).
9. Sesión renovada: insertar a mano una sesión que vence en 5 días
   (`db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(hashToken('t1'), user.id, new Date(Date.now() + 5 * 864e5).toISOString())`),
   pedir `/app/planner` con `cookies: { pc_session: 't1' }` → pasa y `jar.get('pc_session')?.value === 't1'` (se re-seteó).
10. Excepción en `/api/algo` **con sesión** → 500 `{ error: { code: 'INTERNAL', message: 'Ocurrió un error inesperado. Probá de nuevo.' } }`,
    el body no contiene `'secreto'` y `console.error` fue llamado (`vi.spyOn(console, 'error').mockImplementation(() => {})`).
11. Excepción en `/app/planner` con sesión → la promesa rechaza con `/secreto/`.
12. Prerender: `context` con `isPrerendered = true` (`(context as { isPrerendered: boolean }).isPrerendered = true`) en `/app/planner` sin cookie → pasa.

Imports: `createTestDb, setDb, type Db` de `@/lib/db`; `createSession, hashToken` de `@/services/auth`;
`apiContext` de `../helpers/api`; `createUser` de `../helpers/fixtures`; `onRequest` de `@/middleware`;
`type MiddlewareNext` de `astro`.

## Verificación
```bash
npx vitest run tests/api/middleware.test.ts
npx vitest run
npm run check
# Con el servidor de desarrollo levantado (ver README):
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:4321/app/planner
# → 302 http://localhost:4321/login?next=%2Fapp%2Fplanner
curl -s http://localhost:4321/api/health   # → {"ok":true,...} (sigue público)
```

## Hecho cuando
- [ ] Los 12 casos pasan.
- [ ] Los dos `curl` dan lo esperado.

## Commit
`feat(identity): ID-09 middleware de sesión y protección de rutas`
