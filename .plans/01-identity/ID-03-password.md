# ID-03 · Hash de contraseñas con scrypt

- **Módulo:** identity · **Depende de:** — · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` líneas 33–36 (Reglas: email, contraseña, hash).

## Archivos
- Crear: `src/lib/password.ts`
- Crear: `tests/lib/password.test.ts`

## Contrato — `src/lib/password.ts`
```ts
/** Devuelve "scrypt$<salt hex>$<hash hex>" (salt aleatorio de 16 bytes, clave de 64 bytes). */
export async function hashPassword(plain: string): Promise<string>;

/** true si `plain` corresponde a `stored`. Formato inválido → false (nunca lanza). */
export async function verifyPassword(plain: string, stored: string): Promise<boolean>;
```
Implementación (sin dependencias, solo `node:crypto` y `node:util`):
```ts
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;
```
- `hashPassword`: `salt = randomBytes(16)`, `key = await scryptAsync(plain, salt, KEY_LENGTH)`,
  devuelve `` `scrypt$${salt.toString('hex')}$${key.toString('hex')}` ``.
- `verifyPassword`: `split('$')`; si no son 3 partes o la primera no es `'scrypt'` → `false`.
  Derivar con el mismo salt; si el largo del hash guardado no es 64 bytes → `false`;
  comparar con `timingSafeEqual`.

## Tests primero — `tests/lib/password.test.ts`
1. `hashPassword('secreta123')` matchea `/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/`.
2. Dos hashes de la misma contraseña son distintos (salt aleatorio).
3. `verifyPassword('secreta123', hash)` → `true`.
4. `verifyPassword('otra-cosa', hash)` → `false`.
5. Formatos inválidos → `false` sin lanzar: `''`, `'texto-plano'`, `'bcrypt$aa$bb'`, `'scrypt$00$00'`.
6. El hash no contiene la contraseña: `expect(hash).not.toContain('secreta123')`.

## Verificación
```bash
npx vitest run tests/lib/password.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 6 casos pasan.

## Commit
`feat(identity): ID-03 hash de contraseñas con scrypt`
