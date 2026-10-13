# ID-05 · Sesiones: crear, validar (con renovación), borrar

- **Módulo:** identity · **Depende de:** ID-04 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-identity.md` líneas 25–39 (tabla `sessions` y Reglas de token, expiración y limpieza).
- `src/services/auth.ts` (lo creó ID-04; esta tarea **agrega** funciones al final, no cambia las existentes).

## Archivos
- Modificar: `src/services/auth.ts` (agregar al final)
- Crear: `tests/services/auth-sessions.test.ts`

## Contrato — agregar a `src/services/auth.ts`
```ts
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_TTL_DAYS = 30;
export const SESSION_RENEW_BELOW_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

/** SHA-256 en hex. En la base solo se guarda esto, nunca el token. */
export function hashToken(token: string): string;

/** Crea la sesión. `token` = 32 bytes aleatorios en base64url. Vence en 30 días desde `now`. */
export function createSession(db: Db, userId: number, now = new Date()): { token: string; expiresAt: Date };

/**
 * Valida el token.
 * - No existe → null.
 * - Vencida (expires_at <= now) → borra la fila y devuelve null.
 * - Le quedan menos de 15 días → extiende a now + 30 días y devuelve renewed: true.
 */
export function validateSession(
  db: Db,
  token: string,
  now = new Date(),
): { user: User; expiresAt: Date; renewed: boolean } | null;

export function deleteSession(db: Db, token: string): void;

/** Borra todas las sesiones vencidas (expires_at <= now). Devuelve cuántas borró. */
export function deleteExpiredSessions(db: Db, now = new Date()): number;
```
Fechas: `expires_at` se guarda con `date.toISOString()` (ej. `'2026-11-12T15:00:00.000Z'`); como todas tienen
el mismo formato, se pueden comparar como texto en SQL.

SQL a usar:
```sql
INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?);
SELECT s.expires_at, u.id, u.email, u.name
  FROM sessions s JOIN users u ON u.id = s.user_id
 WHERE s.id = ?;
UPDATE sessions SET expires_at = ? WHERE id = ?;
DELETE FROM sessions WHERE id = ?;
DELETE FROM sessions WHERE expires_at <= ?;
```

## Tests primero — `tests/services/auth-sessions.test.ts`
`beforeEach`: `db = createTestDb()`, `user = createUser(db)` (de `../helpers/fixtures`).
Usar `const now = new Date('2026-10-13T12:00:00.000Z')`.
1. `createSession(db, user.id, now)` → `token` matchea `/^[A-Za-z0-9_-]{43}$/` y `expiresAt.toISOString() === '2026-11-12T12:00:00.000Z'`.
2. La tabla guarda `hashToken(token)` y no el token: `SELECT id FROM sessions` → igual a `hashToken(token)` y distinto de `token`.
3. `hashToken('abc')` → `'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'`.
4. `validateSession(db, token, now)` → `{ user: { id, email: 'ana@mail.com', name: 'Ana' }, renewed: false }` y el mismo `expiresAt`.
5. Token desconocido → `null`.
6. Vencida: validar con `new Date('2026-11-12T12:00:00.000Z')` (justo al vencer) → `null` y la fila se borró (`count = 0`).
7. Renovación: validar a los 20 días (`2026-11-02T12:00:00.000Z`) → `renewed: true` y `expiresAt` = `2026-12-02T12:00:00.000Z`; la fila tiene ese valor.
8. Sin renovación a los 10 días (`2026-10-23T12:00:00.000Z`) → `renewed: false`.
9. `deleteSession(db, token)` → después `validateSession` da `null`.
10. `deleteExpiredSessions`: crear una sesión con `now` y otra con `new Date('2026-12-01T00:00:00.000Z')`;
    `deleteExpiredSessions(db, new Date('2026-11-20T00:00:00.000Z'))` → devuelve `1` y queda 1 fila.

## Verificación
```bash
npx vitest run tests/services/auth-sessions.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 10 casos pasan y los tests de ID-04 siguen pasando.

## Commit
`feat(identity): ID-05 sesiones con token hasheado y expiración deslizante`
