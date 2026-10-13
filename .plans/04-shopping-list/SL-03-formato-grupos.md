# SL-03 · Formato y agrupado: `formatQty`, `manualToItem`, `buildAisles`

- **Módulo:** shopping-list · **Depende de:** SL-02 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 29–30 (pasos 7 y 8), 59–60 (manuales en su góndola, `key` `manual|<id>`)
  y 70–96 (JSON de `ShoppingList`).

## Archivos
- Modificar: `src/services/shopping-list.ts` (agregar al final)
- Crear: `tests/services/shopping-aisles.test.ts`

## Contrato — agregar a `src/services/shopping-list.ts`
```ts
import { AISLES } from '@/services/recipes';

export interface ShoppingItem {
  key: string;
  id?: number;          // solo los manuales
  name: string;
  qty: number | null;
  unit: string | null;
  manual: boolean;
}

export interface ShoppingAisle {
  aisle: Aisle;
  items: ShoppingItem[];
}

export interface ShoppingList {
  weekStart: string;
  aisles: ShoppingAisle[];
  customMeals: string[];
}

export interface ManualItem {
  id: number;
  name: string;
  qty: number | null;
  unit: string | null;
  aisle: Aisle;
}

/** Redondea a 2 decimales: 1.005 → 1.01 no importa; 0.1 + 0.2 → 0.3. */
export function round2(value: number): number; // Math.round(value * 100) / 100

/** g ≥ 1000 → kg; ml ≥ 1000 → l; redondeo a 2 decimales. qty null queda null. */
export function formatQty(qty: number | null, unit: BaseUnit): { qty: number | null; unit: string };

export function manualToItem(item: ManualItem): ShoppingItem; // { key: `manual|${id}`, id, name, qty, unit, manual: true }

/**
 * Junta líneas de recetas (formateadas) y manuales por góndola.
 * Góndolas en el orden de AISLES (sin las vacías); dentro de cada una, por nombre con localeCompare('es').
 */
export function buildAisles(lines: ConsolidatedLine[], manual: ManualItem[]): ShoppingAisle[];
```
- Ítem de receta: `{ key: line.key, name: line.name, ...formatQty(line.qty, line.unit), manual: false }` (sin `id`).
- `formatQty`: si `qty === null` → `{ qty: null, unit }`; si `unit === 'g' && qty >= 1000` → `{ qty: round2(qty / 1000), unit: 'kg' }`;
  igual con `ml` → `l`; si no → `{ qty: round2(qty), unit }`.

## Tests primero — `tests/services/shopping-aisles.test.ts`
1. `formatQty(1500, 'g')` → `{ qty: 1.5, unit: 'kg' }`; `(750, 'g')` → `{ qty: 750, unit: 'g' }`; `(1000, 'ml')` → `{ qty: 1, unit: 'l' }`;
   `(999, 'ml')` → `{ qty: 999, unit: 'ml' }`; `(0.1 + 0.2, 'cda')` → `{ qty: 0.3, unit: 'cda' }`; `(null, 'a gusto')` → `{ qty: null, unit: 'a gusto' }`;
   `(1234.567, 'g')` → `{ qty: 1.23, unit: 'kg' }`.
2. **Ejemplo de la spec completo:** `buildAisles(consolidate([Tomate 2 unidad, tomate 3 unidad, Papa 500 g, Papa 1 kg]), [])` →
   `[{ aisle: 'Verdulería', items: [ { key: 'papa|g', name: 'Papa', qty: 1.5, unit: 'kg', manual: false }, { key: 'tomate|unidad', name: 'Tomate', qty: 5, unit: 'unidad', manual: false } ] }]`.
3. Orden de góndolas: líneas en `'Otros'`, `'Verdulería'` y `'Lácteos'` → `['Verdulería', 'Lácteos', 'Otros']`.
4. Manual: `manualToItem({ id: 3, name: 'Detergente', qty: 1, unit: 'unidad', aisle: 'Otros' })` →
   `{ key: 'manual|3', id: 3, name: 'Detergente', qty: 1, unit: 'unidad', manual: true }`.
5. Manual y receta con el mismo nombre (`'Tomate'`, Verdulería) → **dos** ítems en Verdulería (no se suman), uno con `manual: true`.
6. Dentro de la góndola, orden alfabético mezclando manuales y de recetas: `'Zanahoria'` (receta), `'Acelga'` (manual), `'Ñame'` (receta) →
   `['Acelga', 'Ñame', 'Zanahoria']`.
7. Solo manuales → solo esas góndolas. Nada → `[]`.

## Verificación
```bash
npx vitest run tests/services/shopping-aisles.test.ts tests/services/shopping-consolidate.test.ts --coverage --coverage.include=src/services/shopping-list.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan y `shopping-list.ts` sigue con 100 % de ramas.

## Commit
`feat(shopping-list): SL-03 formato de cantidades y agrupado por góndola`
