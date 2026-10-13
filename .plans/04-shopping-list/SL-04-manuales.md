# SL-04 · Ítems manuales: esquema y CRUD

- **Módulo:** shopping-list · **Depende de:** SL-01, SL-03 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 40–61 y 67–68 (body del POST: `qty`, `unit` y `aisle` opcionales).

## Archivos
- Modificar: `src/services/shopping-list.ts` (agregar al final)
- Crear: `tests/services/shopping-manual.test.ts`

## Contrato — agregar a `src/services/shopping-list.ts`
```ts
import { z } from 'astro/zod';
import type { Db } from '@/lib/db';

/** Unidades permitidas en ítems manuales (todas menos "a gusto"). */
export const MANUAL_UNITS = ['unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza'] as const;

export const ManualItemInput = z
  .object({
    name: z.string().trim().min(1, 'Escribí qué querés comprar').max(60, 'Máximo 60 caracteres'),
    qty: z.number().positive('Tiene que ser mayor a 0').optional(),
    unit: z.enum(MANUAL_UNITS).optional(),
    aisle: z.enum(AISLES).default('Otros'),
  })
  .refine((i) => (i.qty === undefined) === (i.unit === undefined), {
    message: 'La cantidad y la unidad van juntas',
    path: ['qty'],
  });
export type ManualItemData = z.infer<typeof ManualItemInput>;

/** Ítems manuales de la semana, en orden de creación (id). */
export function listManualItems(db: Db, userId: number, weekStart: string): ManualItem[];

export function addManualItem(db: Db, userId: number, weekStart: string, input: ManualItemData): ManualItem;

/** true si borró; false si no existe o es de otro usuario. */
export function deleteManualItem(db: Db, userId: number, id: number): boolean;
```
SQL:
```sql
SELECT id, name, qty, unit, aisle FROM shopping_list_manual_items WHERE user_id = ? AND week_start = ? ORDER BY id;
INSERT INTO shopping_list_manual_items (user_id, week_start, name, qty, unit, aisle) VALUES (?, ?, ?, ?, ?, ?);
DELETE FROM shopping_list_manual_items WHERE id = ? AND user_id = ?;
```
`addManualItem`: `qty ?? null`, `unit ?? null`; devuelve `{ id, name, qty, unit, aisle }`.
`deleteManualItem`: `result.changes === 1`.

## Tests primero — `tests/services/shopping-manual.test.ts`
`beforeEach`: `db = createTestDb()`, `ana`, `beto`. `W = '2026-10-12'`.
1. `ManualItemInput.safeParse({ name: ' Detergente ' })` → `{ name: 'Detergente', aisle: 'Otros' }`.
2. `{ name: 'Yerba', qty: 1, unit: 'kg', aisle: 'Almacén' }` ok.
3. Fallan: `{ name: 'X', qty: 1 }` (path `qty`, mensaje `'La cantidad y la unidad van juntas'`), `{ name: 'X', unit: 'g' }`,
   `{ name: 'X', qty: 1, unit: 'a gusto' }`, `{ name: '' }`, `{ name: 'X', aisle: 'Ferretería' }`.
4. `addManualItem(db, ana.id, W, { name: 'Detergente', aisle: 'Otros' })` → `{ id: 1, name: 'Detergente', qty: null, unit: null, aisle: 'Otros' }`.
5. `listManualItems` devuelve solo los de esa semana y de ese usuario, en orden de creación.
6. `deleteManualItem(db, ana.id, id)` → `true` y ya no está; repetir → `false`.
7. `deleteManualItem(db, beto.id, idDeAna)` → `false` y el ítem sigue.

## Verificación
```bash
npx vitest run tests/services/shopping-manual.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan.

## Commit
`feat(shopping-list): SL-04 ítems manuales de la lista`
