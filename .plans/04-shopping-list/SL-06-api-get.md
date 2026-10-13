# SL-06 · Endpoint `GET /api/shopping-list`

- **Módulo:** shopping-list · **Depende de:** SL-05 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 63–66 y 70–96.
- `src/pages/api/plan/index.ts` (PL-06): este endpoint es igual, cambiando el service.

## Archivos
- Crear: `src/pages/api/shopping-list/index.ts`
- Crear: `tests/api/shopping-list.test.ts`

## Contrato — `src/pages/api/shopping-list/index.ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json } from '@/lib/http';
import { WeekStart, weekStartOf } from '@/lib/week';
import { getShoppingList } from '@/services/shopping-list';

export const GET: APIRoute = ({ url, locals }) => {
  const raw = url.searchParams.get('week');
  let week = weekStartOf(new Date());
  if (raw !== null) {
    const parsed = WeekStart.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION', 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)');
    }
    week = parsed.data;
  }
  return json(getShoppingList(getDb(), locals.user!.id, week));
};
```

## Tests primero — `tests/api/shopping-list.test.ts`
Setup estándar + `user`; `tarta = insertRecipe(db, { ingredients: [ { name: 'Tomate', qty: 2, unit: 'unidad', aisle: 'Verdulería' } ] })`;
`insertEntry(db, user.id, '2026-10-12', 0, 'cena', tarta)` y `insertEntry(db, user.id, '2026-10-12', 1, 'cena', 'Delivery')`.
1. `?week=2026-10-12` → 200 y body exacto:
   `{ weekStart: '2026-10-12', aisles: [ { aisle: 'Verdulería', items: [ { key: 'tomate|unidad', name: 'Tomate', qty: 2, unit: 'unidad', manual: false } ] } ], customMeals: ['Delivery'] }`.
2. Sin `week` y con la fecha fijada (`vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime(new Date('2026-10-14T12:00:00-03:00'))`) → mismo `weekStart: '2026-10-12'`.
3. `?week=2026-10-13` → 400 `VALIDATION`.
4. Otro usuario pidiendo la misma semana → `aisles: []`.

## Verificación
```bash
npx vitest run tests/api/shopping-list.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 4 casos pasan.

## Commit
`feat(shopping-list): SL-06 endpoint de la lista de compras`
