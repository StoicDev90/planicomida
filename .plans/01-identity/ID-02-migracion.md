# ID-02 · Migración `001_identity.sql` y fixture `createUser`

- **Módulo:** identity · **Depende de:** ID-01 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` líneas 15–31 (Datos).
- `.specs/SPEC-core.md` líneas 83–92 (Base de datos — reglas comunes).

## Archivos
- Crear: `db/migrations/001_identity.sql`
- Crear: `tests/helpers/fixtures.ts`
- Crear: `tests/db/identity-schema.test.ts`

## Contrato

### `db/migrations/001_identity.sql` — copiar tal cual
```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user_id ON sessions(user_id);
```

### `tests/helpers/fixtures.ts` — copiar tal cual
```ts
import type { Db } from '@/lib/db';
import type { TestUser } from './api';

/** Inserta un usuario directo en la base (con un hash falso). */
export function createUser(db: Db, email = 'ana@mail.com', name = 'Ana'): TestUser {
  const result = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, 'scrypt$00$00')")
    .run(email, name);
  return { id: Number(result.lastInsertRowid), email, name };
}
```

## Tests primero — `tests/db/identity-schema.test.ts`
Cada test usa `const db = createTestDb()` (de `@/lib/db`).
1. `schemaVersion(db)` es `>= 1`.
2. `createUser(db)` devuelve `{ id: 1, email: 'ana@mail.com', name: 'Ana' }`.
3. Email único sin distinguir mayúsculas: `createUser(db, 'ana@mail.com')` y después `createUser(db, 'ANA@mail.com')` → lanza error que matchea `/UNIQUE/`.
4. Nombre vacío: `createUser(db, 'b@mail.com', '')` → lanza `/CHECK/`.
5. Sesión con usuario inexistente:
   `db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES ('x', 99, '2030-01-01')").run()` → lanza `/FOREIGN KEY/`.
6. Borrar el usuario borra sus sesiones: insertar usuario + sesión `('x', <id>, '2030-01-01')`,
   `DELETE FROM users WHERE id = ?` → `SELECT count(*) FROM sessions` da `0`.

## Verificación
```bash
npx vitest run tests/db/identity-schema.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 6 casos pasan.
- [ ] Si el servidor de desarrollo está corriendo, reiniciarlo y `curl -s localhost:4321/api/health` muestra `"schemaVersion":1`.

## Commit
`feat(identity): ID-02 migración de users y sessions`
