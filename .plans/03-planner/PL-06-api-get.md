# PL-06 · Endpoint `GET /api/plan`

- **Módulo:** planner · **Depende de:** PL-03 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-planner.md` líneas 41–42, 59 y 93–94.
- `.plans/README.md` → "Cómo testear un endpoint".

## Archivos
- Crear: `src/pages/api/plan/index.ts`
- Crear: `tests/api/plan.test.ts`

## Contrato — `src/pages/api/plan/index.ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json } from '@/lib/http';
import { WeekStart, weekStartOf } from '@/lib/week';
import { getWeekPlan } from '@/services/plan';

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
  return json(getWeekPlan(getDb(), locals.user!.id, week));
};
```

## Tests primero — `tests/api/plan.test.ts`
Setup estándar + `user = createUser(db)`. Para fijar la fecha:
```ts
afterEach(() => vi.useRealTimers());
vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2026-10-18T15:00:00-03:00')); // domingo
```
1. Sin `week`, con la fecha fijada en el domingo 18/10/2026 → `weekStart === '2026-10-12'`.
2. `?week=2026-10-12` con una entrada (`insertEntry`) → 200 y `entries.length === 1`, `prevWeek: '2026-10-05'`, `nextWeek: '2026-10-19'`.
3. `?week=2026-10-13` → 400 `{ error: { code: 'VALIDATION', message: 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)' } }`.
4. `?week=2026-02-30` y `?week=hola` → 400.
5. Aislamiento: una entrada de otro usuario en la misma semana no aparece.

## Verificación
```bash
npx vitest run tests/api/plan.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 5 casos pasan.

## Commit
`feat(planner): PL-06 endpoint para leer el plan de una semana`
