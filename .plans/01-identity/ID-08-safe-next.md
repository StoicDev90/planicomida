# ID-08 · Validar el parámetro `?next=`

- **Módulo:** identity · **Depende de:** — · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` línea 43 y línea 73 (`next` solo acepta rutas internas que empiezan con `/app`).

## Archivos
- Crear: `src/lib/safe-next.ts`
- Crear: `tests/lib/safe-next.test.ts`

## Contrato — `src/lib/safe-next.ts`
```ts
export const DEFAULT_AFTER_LOGIN = '/app/planner';

/**
 * Devuelve `value` si es una ruta interna de la app; si no, '/app/planner'.
 * Válida = empieza con '/app' seguida de fin, '/' o '?', no contiene '//', '\\' ni '..'.
 */
export function safeNext(value: string | null | undefined): string;
```
Implementación sugerida:
```ts
if (!value) return DEFAULT_AFTER_LOGIN;
if (!/^\/app(?:[/?]|$)/.test(value)) return DEFAULT_AFTER_LOGIN;
if (value.includes('//') || value.includes('\\') || value.includes('..')) return DEFAULT_AFTER_LOGIN;
return value;
```

## Tests primero — `tests/lib/safe-next.test.ts`
Con `it.each`:
| Entrada | Salida |
|---------|--------|
| `'/app/planner'` | `'/app/planner'` |
| `'/app/lista?semana=2026-10-12'` | `'/app/lista?semana=2026-10-12'` |
| `'/app'` | `'/app'` |
| `null` | `'/app/planner'` |
| `undefined` | `'/app/planner'` |
| `''` | `'/app/planner'` |
| `'https://evil.com'` | `'/app/planner'` |
| `'//evil.com'` | `'/app/planner'` |
| `'/application'` | `'/app/planner'` |
| `'/app/../admin'` | `'/app/planner'` |
| `'/app\\evil'` (barra invertida) | `'/app/planner'` |
| `'/login'` | `'/app/planner'` |

## Verificación
```bash
npx vitest run tests/lib/safe-next.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 12 casos pasan.

## Commit
`feat(identity): ID-08 validación de la ruta next`
