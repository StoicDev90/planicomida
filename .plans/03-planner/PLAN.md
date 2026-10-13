# Plan maestro: planner

> Spec: `.specs/SPEC-planner.md` (aprobada) · Depende de: `core`, `identity`, `recipes` · Estado: **PENDIENTE**

## Objetivo
Plan por semana (lunes a domingo × desayuno, almuerzo, snack y cena), con historial, navegación entre semanas,
asignación de recetas o comidas libres y "copiar semana". Expone a `shopping-list` `getRecipeIdsForWeek`
(con repeticiones, en orden día → turno).

## Decisiones de diseño
- **Service único** `src/services/plan.ts`, construido en 4 tareas (PL-02 constantes y esquemas, PL-03 lectura,
  PL-04 escritura, PL-05 copiar), siempre agregando al final.
- **Upsert con `ON CONFLICT`** sobre `UNIQUE (user_id, week_start, day, meal_type)`: asignar es idempotente.
- **Copiar semana** usa `INSERT … ON CONFLICT DO NOTHING`: solo llena turnos vacíos. Las entradas con recetas
  borradas se saltean (`skipped`). Comidas libres se copian.
- **Rutas de la API:** `src/pages/api/plan/[week]/[day]/[meal].ts` y `src/pages/api/plan/[week]/copy-from/[sourceWeek].ts`.
  Astro prioriza el segmento estático `copy-from`, así que no chocan.
- **Vista pura testeable:** `src/lib/week-view.ts` (PL-09) arma los 7 días × 4 turnos, las etiquetas y "hoy"
  a partir de un `WeekPlan`. La página solo pinta.
- **Página:** `/app/planner?semana=YYYY-MM-DD` se renderiza en el servidor (semana inválida → semana actual).
  Asignar y quitar usan un `<dialog>` con `fetch` (PL-11). **Copiar semana** es un formulario POST a la misma página
  (funciona sin JS) que redirige con `?semana=…&copiadas=N&omitidas=M` para mostrar el mensaje (PL-12).
- **"Hoy primero" en el celular:** la columna del día de hoy lleva `max-lg:order-first` (en la grilla de PC queda en su lugar).

## Componentes y dependencias
```
PL-01 migración ── PL-02 constantes ── PL-03 lectura ── PL-04 escritura ── PL-05 copiar
                                          │                 │                 │
                                          ├─ PL-06 API GET  ├─ PL-07 API slot └─ PL-08 API copiar
PL-09 week-view (necesita PL-02) ─────────┴── PL-10 página + MealSlot ── PL-11 SlotPicker ── PL-12 copiar en la página
                                                                                         PL-13 checkpoint
```
- **Secuencial:** PL-01 → PL-02 → PL-03 → PL-04 → PL-05 (comparten `plan.ts`).
- **En paralelo:** PL-06, PL-07 y PL-08 (cada una después de su función); PL-09 después de PL-02.
- UI: PL-10 → PL-11 → PL-12 (tocan la misma página).

## Tareas
| ID | Tarea | Archivos | Depende de | Modelo |
|----|-------|----------|------------|--------|
| [PL-01](PL-01-migracion.md) | Migración `003_planner.sql` | `db/migrations/003_planner.sql`, `tests/db/planner-schema.test.ts` | recipes | chico |
| [PL-02](PL-02-constantes-esquemas.md) | `MEAL_TYPES`, `SlotParams`, `SetMealBody`, tipos | `src/services/plan.ts`, `tests/services/plan-schema.test.ts` | PL-01 | chico |
| [PL-03](PL-03-lectura.md) | `getWeekPlan`, `getEntry`, `getRecipeIdsForWeek` + fixture | `src/services/plan.ts`, `tests/helpers/fixtures.ts`, `tests/services/plan-read.test.ts` | PL-02 | medio |
| [PL-04](PL-04-escritura.md) | `setMeal` (upsert) y `clearMeal` | `src/services/plan.ts`, `tests/services/plan-write.test.ts` | PL-03 | medio |
| [PL-05](PL-05-copiar.md) | `copyWeek` | `src/services/plan.ts`, `tests/services/plan-copy.test.ts` | PL-04 | medio |
| [PL-06](PL-06-api-get.md) | `GET /api/plan` | `src/pages/api/plan/index.ts`, `tests/api/plan.test.ts` | PL-03 | chico |
| [PL-07](PL-07-api-slot.md) | `PUT/DELETE /api/plan/:week/:day/:meal` | `src/pages/api/plan/[week]/[day]/[meal].ts`, `tests/api/plan-slot.test.ts` | PL-04 | chico |
| [PL-08](PL-08-api-copiar.md) | `POST /api/plan/:week/copy-from/:sourceWeek` | `src/pages/api/plan/[week]/copy-from/[sourceWeek].ts`, `tests/api/plan-copy.test.ts` | PL-05 | chico |
| [PL-09](PL-09-week-view.md) | Vista de la semana (función pura) | `src/lib/week-view.ts`, `tests/lib/week-view.test.ts` | PL-02 | chico |
| [PL-10](PL-10-pagina.md) | Página `/app/planner` + `MealSlot` | `src/pages/app/planner.astro`, `src/components/MealSlot.astro` | PL-03, PL-09 | medio |
| [PL-11](PL-11-slot-picker.md) | Diálogo para asignar/quitar | `src/components/SlotPicker.astro`, `src/pages/app/planner.astro` | PL-07, PL-10 | medio |
| [PL-12](PL-12-copiar-pagina.md) | Copiar semana desde la página + link a la lista | `src/pages/app/planner.astro` | PL-05, PL-11 | chico |
| [PL-13](PL-13-checkpoint.md) | Checkpoint del módulo | `.specs/SPEC-planner.md`, `.plans/03-planner/PLAN.md`, `.plans/README.md` | todas | el más capaz |

## Checkpoints
- **Después de PL-08:** API completa con tests en verde.
- **PL-13:** Success Criteria de `SPEC-planner.md`, incluida la prueba manual de 2 minutos en celular y PC.

## Riesgos
| Riesgo | Mitigación |
|--------|------------|
| "Semana actual" depende de la hora del sistema | Los tests fijan la fecha con `vi.useFakeTimers()` + `vi.setSystemTime(...)` |
| Grilla de 7 columnas angosta en 1024–1280 px | Títulos de receta con `break-words`; verificar en PL-13 a 1024 y 1280 px |
| El diálogo es la parte más interactiva | PL-11 trae el script completo; usa `<dialog>` nativo (Esc y foco gratis) |
