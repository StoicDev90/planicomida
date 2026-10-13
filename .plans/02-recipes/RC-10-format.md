# RC-10 · `formatAmount`: mostrar cantidades en español

- **Módulo:** recipes (también lo usa shopping-list) · **Depende de:** — · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` línea 29 ("2 unidad → '2 unidades' en la UI").

## Archivos
- Crear: `src/lib/format.ts`
- Crear: `tests/lib/format.test.ts`

## Contrato — `src/lib/format.ts` (copiar tal cual)
```ts
const numberFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2, useGrouping: false });

/** 1.5 → "1,5"; 1000 → "1000" (sin separador de miles). */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Cantidad + unidad para mostrar: "2 unidades", "1,5 kg", "a gusto". Sin cantidad ni "a gusto" → "". */
export function formatAmount(qty: number | null, unit: string | null): string {
  if (qty === null) return unit === 'a gusto' ? 'a gusto' : '';
  if (unit === 'unidad') return `${formatNumber(qty)} ${qty === 1 ? 'unidad' : 'unidades'}`;
  return unit ? `${formatNumber(qty)} ${unit}` : formatNumber(qty);
}
```

## Tests primero — `tests/lib/format.test.ts`
Con `it.each` para `formatAmount`:
| qty | unit | Resultado |
|-----|------|-----------|
| `1` | `'unidad'` | `'1 unidad'` |
| `2` | `'unidad'` | `'2 unidades'` |
| `0.5` | `'unidad'` | `'0,5 unidades'` |
| `1.5` | `'kg'` | `'1,5 kg'` |
| `750` | `'g'` | `'750 g'` |
| `1.234` | `'l'` | `'1,23 l'` |
| `1000` | `'g'` | `'1000 g'` |
| `null` | `'a gusto'` | `'a gusto'` |
| `null` | `null` | `''` |
| `3` | `null` | `'3'` |
Y `formatNumber(2.5) === '2,5'`.

## Verificación
```bash
npx vitest run tests/lib/format.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 11 casos pasan.

## Commit
`feat(recipes): RC-10 formato de cantidades en español`
