# ID-10 · Esquemas zod y flows de registro y login (`auth-flows.ts`)

- **Módulo:** identity · **Depende de:** ID-04, ID-05, ID-07 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-identity.md` líneas 33–46 (Reglas) y 49–57 (API).
- `src/lib/http.ts` (completo).

## Archivos
- Modificar: `src/lib/http.ts` → solo cambiar `function fieldErrors(` por `export function fieldErrors(`.
- Crear: `src/services/auth-flows.ts`
- Crear: `tests/services/auth-flows.test.ts`

## Contrato

### Esquemas — al principio de `src/services/auth-flows.ts` (copiar tal cual)
```ts
import { z } from 'astro/zod';

const Email = z
  .string({ error: 'Ingresá tu email' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Ingresá un email válido'));

export const RegisterBody = z.object({
  email: Email,
  name: z.string({ error: 'Ingresá tu nombre' }).trim().min(1, 'Ingresá tu nombre').max(60, 'Máximo 60 caracteres'),
  password: z
    .string({ error: 'Ingresá una contraseña' })
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres'),
});

export const LoginBody = z.object({
  email: Email,
  password: z.string({ error: 'Ingresá tu contraseña' }).min(1, 'Ingresá tu contraseña').max(128),
});
```
> Verificado con la versión instalada (zod 4 vía `astro/zod`): `z.email()` dentro de `.pipe()` funciona y respeta los mensajes.

### Flows — en el mismo `src/services/auth-flows.ts`, debajo de los esquemas
```ts
import type { Db } from '@/lib/db';
import { fieldErrors, type ErrorCode } from '@/lib/http';
import { loginLimiter, type RateLimiter } from '@/lib/rate-limit';
import {
  authenticate, createSession, deleteExpiredSessions, EmailTakenError, registerUser, type User,
} from '@/services/auth';

export type FlowSuccess = { ok: true; user: User; token: string; expiresAt: Date };
export type FlowFailure = {
  ok: false;
  status: 400 | 401 | 409 | 429;
  code: ErrorCode;
  message: string;
  fields?: Record<string, string>;
};
export type FlowResult = FlowSuccess | FlowFailure;

export async function registerFlow(db: Db, raw: unknown, now = new Date()): Promise<FlowResult>;

export async function loginFlow(
  db: Db,
  raw: unknown,
  ip: string,
  now = new Date(),
  limiter: RateLimiter = loginLimiter,
): Promise<FlowResult>;
```
**registerFlow**, en este orden:
1. `RegisterBody.safeParse(raw)`; si falla → `{ ok: false, status: 400, code: 'VALIDATION', message: 'Revisá los datos', fields: fieldErrors(error) }`.
2. `registerUser(db, data)`; si lanza `EmailTakenError` → `{ ok: false, status: 409, code: 'CONFLICT', message: 'Ya hay una cuenta con ese email', fields: { email: 'Ya hay una cuenta con ese email' } }`. Otros errores se relanzan.
3. `createSession(db, user.id, now)` → `{ ok: true, user, token, expiresAt }`.

**loginFlow**, en este orden:
1. `LoginBody.safeParse(raw)`; si falla → 400 `VALIDATION`, `'Revisá los datos'`, `fields`.
2. `key = \`${ip}|${data.email}\``. Si `limiter.isBlocked(key, now.getTime())` →
   `{ ok: false, status: 429, code: 'RATE_LIMITED', message: 'Demasiados intentos. Probá de nuevo en 15 minutos.' }`.
3. `user = await authenticate(db, data.email, data.password)`. Si `null` → `limiter.recordFailure(key, now.getTime())` y
   `{ ok: false, status: 401, code: 'UNAUTHENTICATED', message: 'Email o contraseña incorrectos' }`.
4. Éxito: `limiter.reset(key)`, `deleteExpiredSessions(db, now)`, `createSession(db, user.id, now)` → `{ ok: true, ... }`.

> Los `import` de las dos partes van juntos al principio del archivo.

## Tests primero — `tests/services/auth-flows.test.ts`
`beforeEach`: `db = createTestDb()`; `limiter = createRateLimiter({ max: 3, windowMs: 60_000 })`.
`const valid = { email: 'Ana@Mail.com', name: 'Ana', password: 'secreta123' }`.

registerFlow:
1. `valid` → `ok: true`, `user.email === 'ana@mail.com'`, `token` string, 1 fila en `sessions`.
2. Repetir con `{ ...valid, email: ' ANA@mail.com ' }` → `{ ok: false, status: 409, code: 'CONFLICT' }` y `fields.email` definido.
3. `{ email: 'no-es-email', name: '', password: '123' }` → 400 y `Object.keys(fields).sort()` = `['email', 'name', 'password']`.
4. `{}` → 400 con `fields.email === 'Ingresá tu email'`.

loginFlow (registrar primero con `registerFlow(db, valid)`):
5. `{ email: 'ANA@mail.com', password: 'secreta123' }`, ip `'1.1.1.1'`, `limiter` → `ok: true`.
6. Contraseña mala → `{ status: 401, message: 'Email o contraseña incorrectos' }`.
7. Email inexistente → exactamente el mismo `status` y `message` que el caso 6.
8. 3 fallos con la misma ip+email → el 4.º intento (aun con la contraseña correcta) → 429 `RATE_LIMITED`.
9. Después de un login exitoso, los fallos anteriores se olvidan: 2 fallos, 1 éxito, 2 fallos más → el siguiente intento correcto sigue dando `ok: true`.
10. Limpia sesiones vencidas: insertar a mano una sesión vencida (`expires_at` = `'2000-01-01T00:00:00.000Z'`), hacer login → esa fila ya no existe.
11. `{ email: 'ana@mail.com' }` (sin password) → 400 con `fields.password`.

## Verificación
```bash
npx vitest run tests/services/auth-flows.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 11 casos pasan.
- [ ] `src/lib/http.ts` solo cambió en la palabra `export`.

## Commit
`feat(identity): ID-10 esquemas y flows de registro y login`
