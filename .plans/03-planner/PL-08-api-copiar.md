# PL-08 · Endpoint `POST /api/plan/:week/copy-from/:sourceWeek`

- **Módulo:** planner · **Depende de:** PL-05 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-planner.md` líneas 49–54, 62 y 100–103.

## Archivos
- Crear: `src/pages/api/plan/[week]/copy-from/[sourceWeek].ts`
- Crear: `tests/api/plan-copy.test.ts`

## Contrato — `src/pages/api/plan/[week]/copy-from/[sourceWeek].ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json } from '@/lib/http';
import { WeekStart } from '@/lib/week';
import { copyWeek, getWeekPlan } from '@/services/plan';

export const POST: APIRoute = ({ params, locals }) => {
  const target = WeekStart.safeParse(params.week);
  const source = WeekStart.safeParse(params.sourceWeek);
  if (!target.success || !source.success) {
    return errorResponse(400, 'VALIDATION', 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)');
  }
  if (target.data === source.data) {
    return errorResponse(400, 'VALIDATION', 'No se puede copiar una semana sobre sí misma');
  }
  const db = getDb();
  const userId = locals.user!.id;
  const { copied, skipped } = copyWeek(db, userId, target.data, source.data);
  return json({ copied, skipped, plan: getWeekPlan(db, userId, target.data) });
};
```

## Tests primero — `tests/api/plan-copy.test.ts`
Setup estándar + `user`, `tarta = insertRecipe(db)`; en `'2026-10-05'`: `(0,'almuerzo',tarta)` y `(2,'cena','Delivery')`.
1. POST con `params: { week: '2026-10-12', sourceWeek: '2026-10-05' }` → 200 con `copied: 2`, `skipped: 0` y `plan.entries.length === 2`, `plan.weekStart === '2026-10-12'`.
2. Repetir el POST → `copied: 0` (los turnos ya están ocupados).
3. `week` igual a `sourceWeek` → 400 `'No se puede copiar una semana sobre sí misma'`.
4. `sourceWeek: '2026-10-06'` (martes) → 400 `'La semana debe ser la fecha de un lunes (YYYY-MM-DD)'`.

## Verificación
```bash
npx vitest run tests/api/plan-copy.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 4 casos pasan.

## Commit
`feat(planner): PL-08 endpoint para copiar una semana`
