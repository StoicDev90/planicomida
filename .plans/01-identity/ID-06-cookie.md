# ID-06 · Cookie de sesión `pc_session`

- **Módulo:** identity · **Depende de:** ID-01 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` línea 37 (opciones de la cookie).

## Archivos
- Crear: `src/lib/session-cookie.ts`
- Crear: `tests/lib/session-cookie.test.ts`

## Contrato — `src/lib/session-cookie.ts`
```ts
import type { AstroCookies } from 'astro';

export const SESSION_COOKIE = 'pc_session';

/** Setea la cookie con HttpOnly, SameSite=Lax, Path=/, Max-Age hasta `expiresAt`, Secure solo en producción. */
export function setSessionCookie(cookies: AstroCookies, token: string, expiresAt: Date, now = new Date()): void;

export function clearSessionCookie(cookies: AstroCookies): void;
```
Implementación:
```ts
cookies.set(SESSION_COOKIE, token, {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)),
  secure: import.meta.env.PROD,
});
// clear:
cookies.delete(SESSION_COOKIE, { path: '/' });
```

## Tests primero — `tests/lib/session-cookie.test.ts`
Usar `apiContext({ path: '/' })` de `../helpers/api` y pasar `context.cookies` (castear si hace falta:
`context.cookies` ya es del tipo correcto).
1. `setSessionCookie(context.cookies, 'tok', new Date('2026-11-12T12:00:00Z'), new Date('2026-10-13T12:00:00Z'))` →
   `jar.get('pc_session')` es `{ value: 'tok', options: { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 2592000, secure: false } }`
   (en tests `import.meta.env.PROD` es `false`).
2. `expiresAt` en el pasado → `maxAge: 0`.
3. `clearSessionCookie(context.cookies)` → `jar.get('pc_session') === null`.
4. `SESSION_COOKIE === 'pc_session'`.

## Verificación
```bash
npx vitest run tests/lib/session-cookie.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 4 casos pasan.

## Commit
`feat(identity): ID-06 helpers de la cookie de sesión`
