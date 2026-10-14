# Spec: planner — Plan semanal con historial

> Estado: **APROBADA (2026-10-13).** Depende de: `core`, `identity`, `recipes`.
> Reemplaza la parte de `weekly_plans` y `/api/plan` de `02-database-and-api.md`.

## Objective
Que el usuario asigne qué come en cada turno (desayuno, almuerzo, snack y cena) de una semana (de lunes a domingo),
que pueda moverse entre semanas y que las semanas anteriores queden guardadas.

**User stories**
- Como usuario, quiero ver la semana actual en una grilla de 7 días × 4 turnos (desayuno, almuerzo, snack, cena).
- Como usuario, quiero asignar una receta a un turno, o escribir una comida libre ("Delivery", "Sobras").
- Como usuario, quiero cambiar o quitar lo asignado en un turno.
- Como usuario, quiero ir a la semana anterior o siguiente y ver lo que planifiqué.
- Como usuario, quiero copiar la semana anterior (u otra semana) en la que estoy viendo, para no cargar todo de nuevo.

## Datos
```sql
CREATE TABLE meal_plan_entries (
  id               INTEGER PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start       TEXT NOT NULL CHECK (date(week_start) = week_start AND strftime('%w', week_start) = '1'), -- lunes
  day              INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),             -- 0 = lunes … 6 = domingo
  meal_type        TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'snack', 'cena')), -- mismos valores que recipes.category
  recipe_id        INTEGER REFERENCES recipes(id),
  custom_meal_name TEXT CHECK (custom_meal_name IS NULL OR length(custom_meal_name) BETWEEN 1 AND 80),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK ((recipe_id IS NULL) <> (custom_meal_name IS NULL)),                -- exactamente uno de los dos
  UNIQUE (user_id, week_start, day, meal_type)
);
```
Cambios respecto del esquema original:
- Se agregó `week_start`, para guardar el historial.
- `day` pasó a ser un entero, para ordenar sin depender de los nombres.
- `meal_type` suma `desayuno` y `snack`, con los mismos valores que las categorías de receta. En la UI, `snack` se muestra como "Snack / Merienda".
- El orden de los turnos en el día es: desayuno → almuerzo → snack → cena. Se exporta como `MEAL_TYPES` desde `src/services/plan.ts`.
- `UNIQUE` evita dos comidas en el mismo turno.
- El `CHECK` exige una receta **o** un texto libre, nunca ninguno o los dos.

## Reglas
- La semana se identifica con la fecha de su lunes (`YYYY-MM-DD`). "Semana actual" se calcula con la zona horaria `TZ` (ver `SPEC-core.md`).
- Cualquier `week_start` que no sea un lunes válido → 400.
- Asignar a un turno es un **upsert**: si el turno ya tenía algo, se reemplaza. Es idempotente.
- Solo se pueden asignar recetas para las que `canAssignRecipe` devuelva `true` (si no → 404 en la receta).
- Se puede asignar cualquier receta a cualquier turno; la categoría solo sirve para filtrar.
- Las semanas pasadas se pueden editar (no se bloquean).
- Un turno vacío es simplemente que no hay fila.

### Copiar semana
- Copia las entradas de una semana de origen a la semana de destino, en el mismo día y turno, dentro de una transacción.
- **Solo llena turnos vacíos:** lo que ya está cargado en el destino no se pisa, así que no hace falta confirmar.
- Las entradas con recetas borradas se saltean y se informan en `skipped`. Las comidas libres se copian.
- No copia los ítems manuales de la lista de compras.
- Copiar una semana sobre sí misma → 400. Si el origen no tiene entradas → 200 con `copied: 0`.

## API
| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| GET    | `/api/plan?week=2026-10-12` | — (sin `week` = semana actual) | 200 `WeekPlan` |
| PUT    | `/api/plan/:week/:day/:meal` | `{ "recipeId": 7 }` **o** `{ "customMealName": "Delivery" }` | 200 `PlanEntry` · 400 · 404 |
| DELETE | `/api/plan/:week/:day/:meal` | — | 204 (también si el turno ya estaba vacío) |
| POST   | `/api/plan/:week/copy-from/:sourceWeek` | — | 200 `{ copied, skipped, plan: WeekPlan }` · 400 |

`:day` ∈ `0..6`, `:meal` ∈ `desayuno | almuerzo | snack | cena`.

```jsonc
// WeekPlan
{
  "weekStart": "2026-10-12",
  "prevWeek": "2026-10-05",
  "nextWeek": "2026-10-19",
  "entries": [
    { "day": 0, "mealType": "almuerzo", "recipe": { "id": 7, "title": "Tarta de verdura", "deleted": false }, "customMealName": null }
  ]
}
// PlanEntry = un elemento de entries
```

## Contrato que expone a otros módulos (`src/services/plan.ts`)
- `getRecipeIdsForWeek(db, userId, weekStart): number[]`: una entrada por cada turno con receta, **con repeticiones**
  (si la misma receta está en 2 turnos, aparece 2 veces). Lo consume `shopping-list`.

## UI — `/app/planner?semana=YYYY-MM-DD`
- Encabezado: "Semana del lun 12 al dom 18 oct", con botones ◀ ▶ y "Hoy".
- En el celular: lista vertical por día con cuatro tarjetas compactas (Desayuno, Almuerzo, Snack, Cena); el día de hoy aparece primero y abierto. En pantallas `lg` (≥ 1024 px): grilla de 7 columnas × 4 filas con la semana entera a la vista. Entre 768 y 1023 px, la vista de lista en 2 columnas. En el celular, el selector es una hoja inferior a pantalla completa; en la PC, un diálogo centrado.
- Al tocar un turno se abre un selector: buscador de recetas (filtrado de entrada por la categoría del turno, con opción "Ver todas"), campo "Comida libre" y "Quitar".
- La página se renderiza en el servidor con los datos de la semana (no hay carga vacía). Los cambios se mandan con `fetch`
  y la tarjeta se actualiza sin recargar la página.
- Botón "Copiar semana anterior". Después de copiar, muestra "Se copiaron N comidas" (y, si corresponde, "M recetas borradas no se copiaron").
- Un link "Ver lista de compras" lleva a `/app/lista?semana=<misma semana>`.

## Success Criteria
- [x] `GET /api/plan` sin `week` devuelve el lunes de la semana actual según `TZ` (test con fecha fija: domingo 18/10/2026 → `2026-10-12`).
- [x] `week=2026-10-13` (martes) o `week=2026-02-30` → 400.
- [x] Hacer PUT dos veces sobre el mismo turno deja una sola fila con el último valor.
- [x] Un body con `recipeId` **y** `customMealName`, o sin ninguno → 400.
- [x] Asignar una receta de otro usuario o una receta borrada → 404.
- [x] El usuario B no ve ni modifica el plan del usuario A (mismo `week`, resultados independientes).
- [x] Una receta borrada después de asignarse sigue apareciendo en el plan con `deleted: true`.
- [x] Copiar con el destino vacío → mismas entradas que el origen en los mismos turnos; `copied` = cantidad de entradas.
- [x] Copiar con el destino ya cargado en parte → los turnos ocupados no cambian; solo se llenan los vacíos.
- [x] Una receta borrada en el origen → no se copia y suma 1 a `skipped`.
- [x] Copiar una semana sobre sí misma o con una semana inválida → 400; copiar desde la semana de otro usuario no es posible (siempre se usa el `user_id` de la sesión).
- [ ] Navegar ◀ ▶ muestra semanas distintas y los datos de cada una persisten.
- [x] `:meal = merienda` (valor desconocido) → 400; `desayuno` y `snack` se aceptan.
- [ ] Manual: planificar los almuerzos y las cenas de una semana en menos de 2 minutos con recetas del catálogo, tanto en el celular (360 px) como en la PC (1280 px).
- [ ] En la PC, la grilla completa (7 × 4) se ve sin scroll horizontal y el selector de recetas se usa con teclado (Tab, Enter, Esc).

## Fuera de alcance (v1)
Arrastrar y soltar, varios platos por turno, escalar por cantidad de personas, semanas que empiezan en domingo.

## Open Questions
Ninguna.
