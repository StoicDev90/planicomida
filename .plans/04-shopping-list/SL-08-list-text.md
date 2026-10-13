# SL-08 · Texto de la lista para compartir

- **Módulo:** shopping-list · **Depende de:** SL-03 (tipo `ShoppingList`) y RC-10 (`formatAmount`) · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` línea 113 (Compartir/Copiar como texto plano, para WhatsApp).
- `src/lib/format.ts`.

## Archivos
- Crear: `src/lib/list-text.ts`
- Crear: `tests/lib/list-text.test.ts`

## Contrato — `src/lib/list-text.ts`
```ts
import { formatAmount } from '@/lib/format';
import type { ShoppingItem, ShoppingList } from '@/services/shopping-list';

/** "- Papa: 1,5 kg" · "- Sal (a gusto)" · "- Papel higiénico" */
export function itemLine(item: ShoppingItem): string;

/** Texto plano para compartir. `weekLabel` = "Semana del lun 12 al dom 18 oct". */
export function listToText(list: ShoppingList, weekLabel: string): string;
```
Reglas:
- `itemLine`: `amount = formatAmount(item.qty, item.unit)`. Si `item.unit === 'a gusto'` → `` `- ${name} (a gusto)` ``;
  si `amount` es `''` → `` `- ${name}` ``; si no → `` `- ${name}: ${amount}` ``.
- `listToText`: primera línea `` `Lista del súper · ${weekLabel}` ``. Después, por cada góndola, una línea vacía, el nombre
  de la góndola y una línea por ítem. Si no hay góndolas: línea vacía y `La lista está vacía.`. Unir con `'\n'`.

## Tests primero — `tests/lib/list-text.test.ts`
```ts
const list: ShoppingList = {
  weekStart: '2026-10-12',
  customMeals: [],
  aisles: [
    { aisle: 'Verdulería', items: [
      { key: 'papa|g', name: 'Papa', qty: 1.5, unit: 'kg', manual: false },
      { key: 'tomate|unidad', name: 'Tomate', qty: 5, unit: 'unidad', manual: false },
    ] },
    { aisle: 'Almacén', items: [ { key: 'sal|a gusto', name: 'Sal', qty: null, unit: 'a gusto', manual: false } ] },
    { aisle: 'Otros', items: [
      { key: 'manual|1', id: 1, name: 'Detergente', qty: 1, unit: 'unidad', manual: true },
      { key: 'manual|2', id: 2, name: 'Papel higiénico', qty: null, unit: null, manual: true },
    ] },
  ],
};
```
1. `listToText(list, 'Semana del lun 12 al dom 18 oct')` es exactamente:
```
Lista del súper · Semana del lun 12 al dom 18 oct

Verdulería
- Papa: 1,5 kg
- Tomate: 5 unidades

Almacén
- Sal (a gusto)

Otros
- Detergente: 1 unidad
- Papel higiénico
```
2. Lista sin góndolas → `'Lista del súper · X\n\nLa lista está vacía.'`.
3. `itemLine` con `{ name: 'Leche', qty: 250, unit: 'ml' }` → `'- Leche: 250 ml'`.

## Verificación
```bash
npx vitest run tests/lib/list-text.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 3 casos pasan.

## Commit
`feat(shopping-list): SL-08 texto de la lista para compartir`
