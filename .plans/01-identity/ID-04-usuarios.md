# ID-04 · Usuarios: `registerUser` y `authenticate`

- **Módulo:** identity · **Depende de:** ID-02, ID-03 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` líneas 33–40 (Reglas).
- `src/lib/password.ts` (lo creó ID-03).

## Archivos
- Crear: `src/services/auth.ts` (solo la parte de usuarios; ID-05 agrega sesiones al mismo archivo)
- Crear: `tests/services/auth-users.test.ts`

## Contrato — `src/services/auth.ts`
```ts
import type { Db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';

export interface User {
  id: number;
  email: string;
  name: string;
}

export class EmailTakenError extends Error {
  constructor() {
    super('Ya hay una cuenta con ese email');
    this.name = 'EmailTakenError';
  }
}

/** trim + minúsculas. */
export function normalizeEmail(email: string): string;

/** Crea el usuario. Lanza EmailTakenError si el email ya existe (sin distinguir mayúsculas). */
export async function registerUser(
  db: Db,
  input: { email: string; name: string; password: string },
): Promise<User>;

/** Usuario si email y contraseña coinciden; si no, null. */
export async function authenticate(db: Db, email: string, password: string): Promise<User | null>;
```
SQL a usar:
```sql
-- registerUser
INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)
-- authenticate
SELECT id, email, name, password_hash FROM users WHERE email = ?
```
- `registerUser`: normalizar el email y hacer `name.trim()` antes de insertar. Detectar el email duplicado
  atrapando el error de SQLite cuyo `code` es `'SQLITE_CONSTRAINT_UNIQUE'` y relanzarlo como `EmailTakenError`.
  Cualquier otro error se relanza tal cual.
- `authenticate`: buscar por el email normalizado; si no hay fila → `null`; si `verifyPassword` da `false` → `null`.
  Nunca devolver `password_hash`.

## Tests primero — `tests/services/auth-users.test.ts`
`beforeEach`: `db = createTestDb()`.
1. `normalizeEmail('  Ana@Mail.COM ')` → `'ana@mail.com'`.
2. `registerUser(db, { email: ' Ana@Mail.com ', name: ' Ana ', password: 'secreta123' })` →
   `{ id: 1, email: 'ana@mail.com', name: 'Ana' }`.
3. La fila guardada tiene `password_hash` que empieza con `'scrypt$'` y **no** contiene `'secreta123'`.
4. Registrar `'ANA@mail.com'` después de `'ana@mail.com'` → rechaza con `EmailTakenError`
   (`await expect(...).rejects.toBeInstanceOf(EmailTakenError)`).
5. `authenticate(db, 'ANA@MAIL.COM', 'secreta123')` → el mismo usuario (sin `password_hash`:
   `expect(Object.keys(user!).sort()).toEqual(['email', 'id', 'name'])`).
6. `authenticate(db, 'ana@mail.com', 'mala')` → `null`.
7. `authenticate(db, 'nadie@mail.com', 'secreta123')` → `null`.

## Verificación
```bash
npx vitest run tests/services/auth-users.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan.

## Commit
`feat(identity): ID-04 registro y autenticación de usuarios`
