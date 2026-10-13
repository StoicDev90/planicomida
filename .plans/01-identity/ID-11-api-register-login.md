# ID-11 · Endpoints `POST /api/auth/register` y `POST /api/auth/login`

- **Módulo:** identity · **Depende de:** ID-06, ID-10 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` líneas 49–57 (API).
- `.plans/README.md` → "Cómo testear un endpoint".

## Archivos
- Crear: `src/pages/api/auth/register.ts`
- Crear: `src/pages/api/auth/login.ts`
- Crear: `tests/api/auth.test.ts`

## Contrato

### `src/pages/api/auth/register.ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json } from '@/lib/http';
import { setSessionCookie } from '@/lib/session-cookie';
import { registerFlow } from '@/services/auth-flows';

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, 'VALIDATION', 'El cuerpo no es JSON válido');
  }
  const result = await registerFlow(getDb(), raw);
  if (!result.ok) return errorResponse(result.status, result.code, result.message, result.fields);
  setSessionCookie(cookies, result.token, result.expiresAt);
  return json({ user: result.user }, 201);
};
```

### `src/pages/api/auth/login.ts`
Igual que `register.ts`, con estas diferencias:
- Desestructurar también `clientAddress`: `async ({ request, cookies, clientAddress }) =>`.
- Llamar `loginFlow(getDb(), raw, clientAddress)`.
- Éxito → `json({ user: result.user }, 200)`.

## Tests primero — `tests/api/auth.test.ts`
Setup estándar (`createTestDb` + `setDb` en `beforeEach`, `setDb(undefined)` en `afterEach`).
`loginLimiter` es compartido: **usar una ip distinta en cada test** (`ip: '10.0.0.<n>'`).

register:
1. `POST` con `body: { email: 'ana@mail.com', name: 'Ana', password: 'secreta123' }` → 201,
   body `{ user: { id: 1, email: 'ana@mail.com', name: 'Ana' } }`, y `jar.get('pc_session')?.value` es un string de 43 caracteres.
2. Mismo email dos veces → la segunda da 409 y `error.code === 'CONFLICT'`.
3. `body: { email: 'x', name: '', password: '1' }` → 400, `error.code === 'VALIDATION'`, `error.fields` con `email`, `name`, `password`.
4. `rawBody: '{roto'` → 400 `{ error: { code: 'VALIDATION', message: 'El cuerpo no es JSON válido' } }`.

login (registrar antes con el endpoint de register o con `registerFlow`):
5. Credenciales correctas → 200, `body.user.email === 'ana@mail.com'`, cookie seteada.
6. Contraseña mala → 401 `{ error: { code: 'UNAUTHENTICATED', message: 'Email o contraseña incorrectos' } }`, sin cookie (`jar.has('pc_session') === false`).
7. Email inexistente → mismo body exacto que el caso 6.
8. 10 intentos fallidos con la misma ip → el 11.º da 429 y `error.code === 'RATE_LIMITED'`.

## Verificación
```bash
npx vitest run tests/api/auth.test.ts
npx vitest run
npm run check
# Con el servidor de desarrollo levantado:
curl -s -i -H 'Content-Type: application/json' -d '{"email":"prueba@mail.com","name":"Prueba","password":"12345678"}' http://localhost:4321/api/auth/register | head -12
# → HTTP/1.1 201 y un header set-cookie: pc_session=...; Path=/; HttpOnly; SameSite=Lax
```

## Hecho cuando
- [ ] Los 8 casos pasan.
- [ ] El `curl` muestra 201 y la cookie con `HttpOnly` y `SameSite=Lax`.

## Commit
`feat(identity): ID-11 endpoints de registro y login`
