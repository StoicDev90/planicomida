# Plan maestro: shopping-list

> Spec: `.specs/SPEC-shopping-list.md` (aprobada) · Depende de: `core`, `identity`, `recipes`, `planner` · Estado: **TERMINADO (2026-10-13) · pendiente la prueba manual en navegador**

## Objetivo
A partir del plan de una semana, una sola lista de compras: el mismo ingrediente una vez y sumado, agrupado por
góndola en el orden del súper, más los ítems manuales de esa semana. En el celular se tacha (estado en `localStorage`)
y se puede compartir como texto.

## Decisiones de diseño
- **El algoritmo es puro y está partido en dos** (`src/services/shopping-list.ts`):
  `consolidate(rows)` suma (SL-02) y `buildAisles(lines, manual)` formatea, mezcla los manuales y ordena (SL-03).
  `getShoppingList` (SL-05) solo junta datos de la base y llama a esas dos funciones. Así el 100 % de ramas se
  alcanza con tests unitarios simples.
- **Entrada del algoritmo:** `getRecipeIdsForWeek` (planner) da los ids con repeticiones en orden día → turno;
  los ingredientes se buscan una vez por receta y se expanden en ese orden. Las recetas borradas se incluyen.
- **Ítems manuales:** mismo archivo de service (SL-04). Se validan con `ManualItemInput` (zod), góndola por defecto
  `'Otros'`, cantidad y unidad juntas u omitidas. No se consolidan con los de recetas.
- **Página sin JS primero:** `/app/lista` se renderiza en el servidor; agregar y borrar ítems manuales son formularios
  POST a la misma página (SL-10). El JS (SL-11) suma tachar, "Destildar todo" y "Compartir".
- **Lógica de cliente testeable:** el texto para compartir (`src/lib/list-text.ts`, SL-08) y el guardado del tachado
  (`src/lib/checked-store.ts`, SL-09) son funciones puras con tests; el script de la página solo las conecta.
- **Reusa:** `normalizeText` (RC-02), `formatAmount` (RC-10), `parseQty` (RC-11), `AISLES`/`UNITS` (RC-03),
  `today`/`weekRangeLabel` (PL-09).

## Componentes y dependencias
```
SL-01 migración ─────────────────────────┐
SL-02 consolidate ── SL-03 formato/grupos ┼─ SL-04 manuales ── SL-05 getShoppingList ─┬─ SL-06 API GET
                                          │                                            ├─ SL-07 API ítems
SL-08 list-text (necesita SL-03) ─────────┤                                            └─ SL-10 página ── SL-11 script
SL-09 checked-store ──────────────────────┘                                                        SL-12 checkpoint
```
- **Secuencial:** SL-02 → SL-03 → SL-04 → SL-05 (comparten `shopping-list.ts`).
- **En paralelo:** SL-01 con SL-02; SL-08 y SL-09 en cualquier momento después de SL-03; SL-06 y SL-07 después de SL-05.
- UI: SL-10 → SL-11.

## Tareas
| ID | Tarea | Archivos | Depende de | Modelo |
|----|-------|----------|------------|--------|
| [SL-01](SL-01-migracion.md) | Migración `004_shopping_list.sql` | `db/migrations/004_shopping_list.sql`, `tests/db/shopping-schema.test.ts` | planner | chico |
| [SL-02](SL-02-consolidar.md) | `toBaseUnit`, `consolidationKey`, `consolidate` | `src/services/shopping-list.ts`, `tests/services/shopping-consolidate.test.ts` | recipes | medio |
| [SL-03](SL-03-formato-grupos.md) | `formatQty`, `manualToItem`, `buildAisles` | `src/services/shopping-list.ts`, `tests/services/shopping-aisles.test.ts` | SL-02 | medio |
| [SL-04](SL-04-manuales.md) | Ítems manuales: esquema y CRUD | `src/services/shopping-list.ts`, `tests/services/shopping-manual.test.ts` | SL-01, SL-03 | chico |
| [SL-05](SL-05-get-shopping-list.md) | `getShoppingList` | `src/services/shopping-list.ts`, `tests/services/shopping-list.test.ts` | SL-04 | medio |
| [SL-06](SL-06-api-get.md) | `GET /api/shopping-list` | `src/pages/api/shopping-list/index.ts`, `tests/api/shopping-list.test.ts` | SL-05 | chico |
| [SL-07](SL-07-api-items.md) | `POST …/:week/items` y `DELETE …/items/:id` | `src/pages/api/shopping-list/[week]/items.ts`, `src/pages/api/shopping-list/items/[id].ts`, `tests/api/shopping-items.test.ts` | SL-04 | chico |
| [SL-08](SL-08-list-text.md) | Texto para compartir | `src/lib/list-text.ts`, `tests/lib/list-text.test.ts` | SL-03 | chico |
| [SL-09](SL-09-checked-store.md) | Guardado del tachado | `src/lib/checked-store.ts`, `tests/lib/checked-store.test.ts` | — | chico |
| [SL-10](SL-10-pagina.md) | Página `/app/lista` (sin JS) | `src/pages/app/lista.astro` | SL-05, SL-08 | medio |
| [SL-11](SL-11-script.md) | Tachar, destildar y compartir | `src/pages/app/lista.astro` | SL-09, SL-10 | medio |
| [SL-12](SL-12-checkpoint.md) | Checkpoint del módulo y de la v1 | `.specs/SPEC-shopping-list.md`, `.plans/04-shopping-list/PLAN.md`, `.plans/README.md` | todas | el más capaz |

## Checkpoints
- **Después de SL-03:** el ejemplo de la spec da el resultado exacto y `shopping-list.ts` tiene 100 % de ramas.
- **SL-12:** Success Criteria de `SPEC-shopping-list.md` y recorrido completo de la v1 (registro → recetas → plan → lista).

## Riesgos
| Riesgo | Mitigación |
|--------|------------|
| Sumas con decimales (0.1 + 0.2) | Se redondea a 2 decimales solo al formatear (`round2` en SL-03) |
| `localStorage` bloqueado (modo privado) | `checked-store` atrapa errores y la página sigue funcionando sin guardar |
| `navigator.share` no existe en la PC | Se copia al portapapeles; si tampoco hay, se muestra el texto en un `<textarea>` |
