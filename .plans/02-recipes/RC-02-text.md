# RC-02 · `normalizeText`: comparar textos sin tildes ni mayúsculas

- **Módulo:** recipes · **Depende de:** — · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` línea 21 (la misma normalización se usa para la clave de la lista).

## Archivos
- Crear: `src/lib/text.ts`
- Crear: `tests/lib/text.test.ts`

## Contrato — `src/lib/text.ts`
```ts
/** trim, colapsa espacios, minúsculas y sin tildes: " Tomaté  Perita " → "tomate perita". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
```

## Tests primero — `tests/lib/text.test.ts`
Con `it.each`:
| Entrada | Salida |
|---------|--------|
| `'Tomate'` | `'tomate'` |
| `'  tomate  '` | `'tomate'` |
| `'Tomaté'` | `'tomate'` |
| `'Limón   Tahití'` | `'limon tahiti'` |
| `'ÑOQUIS'` | `'noquis'` |
| `'Pan\trallado'` | `'pan rallado'` |
| `''` | `''` |
| `'Tomates'` | `'tomates'` (los plurales no se unifican) |

## Verificación
```bash
npx vitest run tests/lib/text.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 8 casos pasan.

## Commit
`feat(recipes): RC-02 normalización de texto sin tildes`
