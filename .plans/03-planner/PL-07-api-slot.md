# PL-07 · Endpoints `PUT` y `DELETE /api/plan/:week/:day/:meal`

- **Módulo:** planner · **Depende de:** PL-04 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-planner.md` líneas 43–44, 60–64 y 95–98, 105.
- `.specs/SPEC-core.md` líneas 113–144 (el ejemplo de Code Style es este mismo endpoint).

## Archivos
- Crear: `src/pages/api/plan/[week]/[day]/[meal].ts`
- Crear: `tests/api/plan-slot.test.ts`

## Contrato — `src/pages/api/plan/[week]/[day]/[meal].ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json, parseBody } from '@/lib/http';
import { clearMeal, SetMealBody, setMeal, SlotParams } from '@/services/plan';

const invalidSlot = () => errorResponse(400, 'VALIDATION', 'Semana, día o comida inválidos');

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const slot = SlotParams.safeParse(params);
  if (!slot.success) return invalidSlot();

  const body = await parseBody(request, SetMealBody);
  if (!body.ok) return body.response;

  const result = setMeal(getDb(), locals.user!.id, slot.data, body.data);
  return result.ok ? json(result.entry) : errorResponse(404, 'NOT_FOUND', 'No existe la receta');
};

export const DELETE: APIRoute = ({ params, locals }) => {
  const slot = SlotParams.safeParse(params);
  if (!slot.success) return invalidSlot();
  clearMeal(getDb(), locals.user!.id, slot.data);
  return new Response(null, { status: 204 });
};
```

## Tests primero — `tests/api/plan-slot.test.ts`
Setup estándar + `ana`, `beto`, `tarta = insertRecipe(db)`.
`const params = { week: '2026-10-12', day: '1', meal: 'almuerzo' }`.
1. PUT `{ recipeId: tarta }` → 200 con `{ day: 1, mealType: 'almuerzo', recipe: { id: tarta, title: 'Tarta de verdura', deleted: false }, customMealName: null }`.
2. PUT dos veces (receta y después `{ customMealName: 'Sobras' }`) → la segunda devuelve `customMealName: 'Sobras'` y queda 1 fila.
3. PUT `{ recipeId: tarta, customMealName: 'x' }` → 400; PUT `{}` → 400.
4. PUT con receta de Beto, pedido por Ana → 404 `{ error: { code: 'NOT_FOUND', message: 'No existe la receta' } }`.
5. Parámetros inválidos → 400 `'Semana, día o comida inválidos'`: `week: '2026-10-13'`, `day: '7'`, `meal: 'merienda'`.
6. `meal: 'desayuno'` y `meal: 'snack'` → 200.
7. DELETE → 204 y el turno queda vacío; DELETE de un turno vacío → 204; DELETE con `day: '9'` → 400.

## Verificación
```bash
npx vitest run tests/api/plan-slot.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan.

## Commit
`feat(planner): PL-07 endpoints para asignar y quitar un turno`
