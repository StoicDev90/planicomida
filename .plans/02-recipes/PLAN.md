# Plan maestro: recipes

> Spec: `.specs/SPEC-recipes.md` (aprobada) · Depende de: `core`, `identity` · Estado: **PENDIENTE**

## Objetivo
Recetas con ingredientes estructurados: un catálogo semilla de solo lectura (`owner_id IS NULL`) y recetas propias
con CRUD completo, borrado lógico y validación estricta (unidades, góndolas, "a gusto"). Expone a `planner`
`getRecipe` y `canAssignRecipe`, y a `shopping-list` las constantes `AISLES` y `UNITS`.

## Decisiones de diseño
- **Un solo service** `src/services/recipes.ts` con constantes, tipos, esquemas zod y funciones. Se construye en
  tres tareas (RC-03 constantes y esquemas, RC-04 lectura, RC-05 escritura), siempre agregando al final.
- **Errores de escritura sin excepciones:** `updateRecipe` y `deleteRecipe` devuelven
  `{ ok: true, value } | { ok: false, error: 'NOT_FOUND' | 'FORBIDDEN' }`. Orden: no existe, borrada o de otro usuario
  → `NOT_FOUND` (404); del catálogo → `FORBIDDEN` (403).
- **Búsqueda sin tildes:** el filtro `q` se aplica en JS con `normalizeText` (`src/lib/text.ts`, RC-02), porque
  `LIKE` de SQLite no ignora tildes. `shopping-list` reusa la misma función para la clave de consolidación.
- **Formato de cantidades compartido:** `formatAmount(qty, unit)` en `src/lib/format.ts` (RC-10), lo usan las
  pantallas de recetas y la lista de compras ("1,5 kg", "2 unidades", "a gusto").
- **Seed idempotente con ids fijos:** `db/seed.sql` usa `INSERT OR IGNORE` con ids 1–14 para recetas e ids
  `receta × 100 + posición` para ingredientes. Se corre con `npm run db:seed` (o `db:reset`) **antes** de crear
  recetas propias (ver Riesgos).
- **Pantallas:** el listado (`/app/recetas`) se renderiza en el servidor y filtra con un formulario GET (funciona sin JS).
  El formulario de receta necesita JS (filas dinámicas) y manda JSON a la API.

## Componentes y dependencias
```
RC-01 migración ──┬─ RC-04 lectura ── RC-05 escritura ──┬─ RC-07 API lista/crear ──┐
RC-02 text.ts ────┤                                     ├─ RC-08 API por id ───────┤
RC-03 constantes ─┘                                     │                          ├─ RC-12 form + /nueva ── RC-13 detalle/edición
                    RC-06 seed (necesita RC-01)         └─ RC-09 página listado    │
RC-10 format.ts ── RC-11 helper del form ──────────────────────────────────────────┘
                                                                        RC-14 checkpoint
```
- **Secuencial:** RC-01 → RC-03 → RC-04 → RC-05 (comparten `recipes.ts` o dependen del esquema).
- **En paralelo:** RC-02, RC-06, RC-10 (archivos independientes); después RC-07, RC-08 y RC-09; RC-11 en cualquier momento después de RC-10.
- RC-12 necesita RC-07 y RC-11; RC-13 necesita RC-08 y RC-12.

## Tareas
| ID | Tarea | Archivos | Depende de | Modelo |
|----|-------|----------|------------|--------|
| [RC-01](RC-01-migracion.md) | Migración `002_recipes.sql` | `db/migrations/002_recipes.sql`, `tests/db/recipes-schema.test.ts` | identity | chico |
| [RC-02](RC-02-text.md) | `normalizeText` | `src/lib/text.ts`, `tests/lib/text.test.ts` | — | chico |
| [RC-03](RC-03-constantes-esquema.md) | Constantes, tipos y esquemas zod | `src/services/recipes.ts`, `tests/services/recipes-schema.test.ts` | RC-01 | chico |
| [RC-04](RC-04-lectura.md) | `listRecipes`, `getRecipe`, `canAssignRecipe` + fixture | `src/services/recipes.ts`, `tests/helpers/fixtures.ts`, `tests/services/recipes-read.test.ts` | RC-02, RC-03 | medio |
| [RC-05](RC-05-escritura.md) | `createRecipe`, `updateRecipe`, `deleteRecipe` | `src/services/recipes.ts`, `tests/services/recipes-write.test.ts` | RC-04 | medio |
| [RC-06](RC-06-seed.md) | Catálogo semilla | `db/seed.sql`, `tests/db/seed.test.ts` | RC-01 | chico |
| [RC-07](RC-07-api-lista-crear.md) | `GET` y `POST /api/recipes` | `src/pages/api/recipes/index.ts`, `tests/api/recipes.test.ts` | RC-05 | chico |
| [RC-08](RC-08-api-por-id.md) | `GET/PUT/DELETE /api/recipes/:id` | `src/pages/api/recipes/[id].ts`, `tests/api/recipes-id.test.ts` | RC-05 | chico |
| [RC-09](RC-09-pagina-listado.md) | Página `/app/recetas` | `src/pages/app/recetas/index.astro`, `src/components/RecipeCard.astro` | RC-04, RC-06 | medio |
| [RC-10](RC-10-format.md) | `formatAmount` | `src/lib/format.ts`, `tests/lib/format.test.ts` | — | chico |
| [RC-11](RC-11-helper-form.md) | Helper del formulario | `src/lib/recipe-form.ts`, `tests/lib/recipe-form.test.ts` | RC-03 | chico |
| [RC-12](RC-12-form-nueva.md) | Componente `RecipeForm` + `/app/recetas/nueva` | `src/components/RecipeForm.astro`, `src/pages/app/recetas/nueva.astro` | RC-07, RC-11 | medio |
| [RC-13](RC-13-detalle.md) | Página `/app/recetas/[id]` (ver, editar, borrar) | `src/pages/app/recetas/[id].astro` | RC-08, RC-10, RC-12 | medio |
| [RC-14](RC-14-checkpoint.md) | Checkpoint del módulo | `.specs/SPEC-recipes.md`, `.plans/02-recipes/PLAN.md`, `.plans/README.md` | todas | el más capaz |

## Checkpoints
- **Después de RC-08:** toda la API de recetas con tests en verde; `curl` con sesión a `/api/recipes` devuelve el catálogo.
- **RC-14:** Success Criteria de `SPEC-recipes.md` verificados.

## Riesgos
| Riesgo | Mitigación |
|--------|------------|
| Ids fijos del seed chocan con recetas propias si se crean antes de sembrar | `db:reset` siempre siembra; el checkpoint verifica el orden. En una base con datos, correr el seed antes de crear recetas |
| `z.number()` recibe strings desde el formulario | El helper `toRecipeInput` (RC-11) convierte a número antes de enviar |
| Formulario con filas dinámicas es la tarea de UI más compleja | RC-12 trae el script casi completo; RC-11 deja la conversión en una función pura y testeada |
