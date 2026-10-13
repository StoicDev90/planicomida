# SL-07 · Endpoints de ítems manuales: `POST` y `DELETE`

- **Módulo:** shopping-list · **Depende de:** SL-04 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 63–68 y 126–130.

## Archivos
- Crear: `src/pages/api/shopping-list/[week]/items.ts`
- Crear: `src/pages/api/shopping-list/items/[id].ts`
- Crear: `tests/api/shopping-items.test.ts`

> Rutas: `/api/shopping-list/items/5` va a `items/[id].ts` (segmento estático primero) y
> `/api/shopping-list/2026-10-12/items` va a `[week]/items.ts`. No chocan.

## Contrato

### `src/pages/api/shopping-list/[week]/items.ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json, parseBody } from '@/lib/http';
import { WeekStart } from '@/lib/week';
import { addManualItem, ManualItemInput, manualToItem } from '@/services/shopping-list';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const week = WeekStart.safeParse(params.week);
  if (!week.success) {
    return errorResponse(400, 'VALIDATION', 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)');
  }
  const body = await parseBody(request, ManualItemInput);
  if (!body.ok) return body.response;
  const item = addManualItem(getDb(), locals.user!.id, week.data, body.data);
  return json(manualToItem(item), 201);
};
```

### `src/pages/api/shopping-list/items/[id].ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import { deleteManualItem } from '@/services/shopping-list';

export const DELETE: APIRoute = ({ params, locals }) => {
  const id = Number(params.id);
  const deleted = Number.isInteger(id) && id > 0 && deleteManualItem(getDb(), locals.user!.id, id);
  return deleted ? new Response(null, { status: 204 }) : errorResponse(404, 'NOT_FOUND', 'No existe el ítem');
};
```

## Tests primero — `tests/api/shopping-items.test.ts`
Setup estándar + `ana`, `beto`.
1. POST `params: { week: '2026-10-12' }`, `body: { name: 'Detergente', qty: 1, unit: 'unidad' }` → 201 y
   `{ key: 'manual|1', id: 1, name: 'Detergente', qty: 1, unit: 'unidad', manual: true }`; y en `getShoppingList` aparece en `'Otros'`.
2. POST `{ name: 'Papel' }` → 201 con `qty: null`, `unit: null`.
3. POST `{ name: 'X', qty: 1 }` → 400 y `error.fields.qty === 'La cantidad y la unidad van juntas'`.
4. POST con `week: '2026-10-13'` → 400.
5. DELETE `params: { id: '1' }` del ítem de Ana, con `user: ana` → 204; repetir → 404 `'No existe el ítem'`.
6. DELETE del ítem de Ana con `user: beto` → 404 y el ítem sigue.
7. DELETE con `id: 'abc'` → 404.

## Verificación
```bash
npx vitest run tests/api/shopping-items.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan.

## Commit
`feat(shopping-list): SL-07 endpoints para agregar y borrar ítems manuales`
