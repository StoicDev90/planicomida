# SL-02 · Consolidación: `toBaseUnit`, `consolidationKey`, `consolidate`

- **Módulo:** shopping-list · **Depende de:** módulo recipes (`normalizeText`, tipos `Unit`/`Aisle`) · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 17–38 (Algoritmo, pasos 1 a 6) — **es la parte más importante de la app**.

## Archivos
- Crear: `src/services/shopping-list.ts` (solo esto; SL-03, SL-04 y SL-05 agregan al final)
- Crear: `tests/services/shopping-consolidate.test.ts`

## Contrato — `src/services/shopping-list.ts`
```ts
import { normalizeText } from '@/lib/text';
import type { Aisle, Unit } from '@/services/recipes';

/** Unidades después de pasar kg → g y l → ml. */
export type BaseUnit = 'unidad' | 'g' | 'ml' | 'cda' | 'cdta' | 'taza' | 'a gusto';

/** Un ingrediente tal como viene de una receta del plan (en orden día → turno → posición). */
export interface IngredientRow {
  name: string;
  qty: number | null;
  unit: Unit;
  aisle: Aisle;
}

export interface ConsolidatedLine {
  key: string;          // "tomate|unidad"
  name: string;         // el de la primera aparición
  aisle: Aisle;         // el de la primera aparición
  qty: number | null;   // suma en unidad base; null para "a gusto"
  unit: BaseUnit;
}

/** kg → g (×1000), l → ml (×1000). El resto igual. qty null queda null. */
export function toBaseUnit(qty: number | null, unit: Unit): { qty: number | null; unit: BaseUnit };

/** `${normalizeText(name)}|${unit}` */
export function consolidationKey(name: string, unit: BaseUnit): string;

/** Suma por clave, en el orden de la primera aparición. "a gusto" no suma (queda qty null). */
export function consolidate(rows: IngredientRow[]): ConsolidatedLine[];
```
Implementación de `consolidate`: un `Map<string, ConsolidatedLine>` (mantiene el orden de inserción).
Por cada fila: `const base = toBaseUnit(row.qty, row.unit)`, `key = consolidationKey(row.name, base.unit)`.
Si la clave no existe → `set(key, { key, name: row.name.trim(), aisle: row.aisle, qty: base.qty, unit: base.unit })`.
Si existe, sumar así (misma clave ⇒ misma unidad ⇒ o las dos tienen cantidad o ninguna, porque "a gusto" es la única sin cantidad):
```ts
} else if (existing.qty !== null) {
  existing.qty += base.qty!;
}
```
No escribir otras condiciones (cada rama de más es una rama sin cubrir). Devolver `[...map.values()]`.

## Tests primero — `tests/services/shopping-consolidate.test.ts`
Helper: `const row = (name: string, qty: number | null, unit: Unit, aisle: Aisle = 'Verdulería'): IngredientRow => ({ name, qty, unit, aisle })`.
1. `toBaseUnit(1, 'kg')` → `{ qty: 1000, unit: 'g' }`; `(1.5, 'l')` → `{ qty: 1500, unit: 'ml' }`; `(2, 'cda')` → `{ qty: 2, unit: 'cda' }`; `(null, 'a gusto')` → `{ qty: null, unit: 'a gusto' }`.
2. `consolidationKey(' Tomaté ', 'unidad')` → `'tomate|unidad'`.
3. **Ejemplo de la spec:** `[row('Tomate', 2, 'unidad'), row('tomate', 3, 'unidad'), row('Papa', 500, 'g'), row('Papa', 1, 'kg')]` →
   `[{ key: 'tomate|unidad', name: 'Tomate', aisle: 'Verdulería', qty: 5, unit: 'unidad' }, { key: 'papa|g', name: 'Papa', aisle: 'Verdulería', qty: 1500, unit: 'g' }]`.
4. Leche: `[row('Leche', 1, 'l', 'Lácteos'), row('Leche', 500, 'ml', 'Lácteos')]` → una línea `qty: 1500, unit: 'ml'`.
5. Unidades incompatibles: `[row('Leche', 1, 'l'), row('Leche', 2, 'taza')]` → **dos** líneas (`'leche|ml'` y `'leche|taza'`).
6. Tres veces `row('Sal', null, 'a gusto', 'Almacén')` → una línea con `qty: null`, `unit: 'a gusto'`.
7. Mayúsculas, tildes y espacios: `'Cebolla'`, `' cebolla '`, `'CEBOLLÁ'` → una línea con `name: 'Cebolla'` y la suma.
8. Plural distinto: `'Tomate'` y `'Tomates'` → dos líneas.
9. Gana la primera góndola: `[row('Huevo', 1, 'unidad', 'Almacén'), row('Huevo', 2, 'unidad', 'Lácteos')]` → `aisle: 'Almacén'`, `qty: 3`.
10. Lista vacía → `[]`.

## Verificación
```bash
npx vitest run tests/services/shopping-consolidate.test.ts --coverage --coverage.include=src/services/shopping-list.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 10 casos pasan con 100 % de ramas en `shopping-list.ts`.

## Commit
`feat(shopping-list): SL-02 consolidación de ingredientes`
