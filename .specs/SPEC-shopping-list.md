# Spec: shopping-list — Lista de compras consolidada

> Estado: **APROBADA (2026-10-13).** Depende de: `core`, `identity`, `planner`, `recipes`.
> Reemplaza la parte de `/api/shopping-list` de `02-database-and-api.md`.

## Objective
Es la lógica central de la app. A partir del plan de una semana, se genera **una** lista de compras
donde el mismo ingrediente aparece una sola vez con la cantidad sumada. Los ingredientes se agrupan por góndola,
en el orden del recorrido del súper, y se pueden tachar mientras se compra.

**User stories**
- Como usuario, quiero ver todo lo que necesito comprar para la semana, sin repetidos.
- Como usuario, quiero la lista agrupada por góndola para recorrer el súper en orden.
- Como usuario, quiero agregar a la lista de la semana cosas que no salen de recetas (papel higiénico, detergente) y poder borrarlas.
- Como usuario, en el súper quiero tachar lo que ya puse en el carrito, desde el celular.

## Algoritmo de consolidación (`src/services/shopping-list.ts`, función pura)
Entrada: los ingredientes de todas las recetas de la semana. Si una receta está en varios turnos, cuenta **una vez por turno**.
Las comidas libres no aportan ingredientes.

1. **Normalizar el nombre** para usarlo como clave: `trim`, colapsar espacios, minúsculas y sin tildes (NFD, quitando las marcas diacríticas).
   "Tomate", " tomate " y "Tomaté" dan la misma clave. Plural y singular **no** se unifican en v1.
2. **Normalizar la unidad** a su unidad base: `kg → g (×1000)` y `l → ml (×1000)`. Las demás quedan igual.
3. **Clave de consolidación** = `nombreNormalizado | unidadBase`. Si un ingrediente aparece con unidades incompatibles
   ("Leche 1 l" y "Leche 2 taza"), quedan **dos líneas**.
4. **Sumar** `qty` por clave. Para `a gusto` no se suma: queda una línea sin cantidad.
5. **Nombre a mostrar:** el de la primera aparición, según el orden día → turno → posición del ingrediente.
6. **Góndola:** la de la primera aparición. (Si una receta dice otra góndola para el mismo ingrediente, gana la primera.)
7. **Formatear la cantidad:** `g ≥ 1000 → kg` y `ml ≥ 1000 → l`. Se redondea a 2 decimales y sin ceros sobrantes (1.5 kg, 750 g, 2 unidad → "2 unidades" en la UI).
8. **Ordenar:** las góndolas en el orden de `AISLES` (las que no tienen ítems no aparecen) y, dentro de cada una, alfabéticamente con `localeCompare('es')`.

Las cantidades se suman tal cual están en las recetas, que son **para 1 persona** (ver `SPEC-recipes.md`).
La lista no escala por comensales.

El orden día → turno es: lunes…domingo, y en cada día desayuno → almuerzo → snack → cena (`MEAL_TYPES`).

Ejemplo: "Tomate 2 unidad" (lunes) + "tomate 3 unidad" (miércoles) + "Papa 500 g" + "Papa 1 kg"
→ Verdulería: Papa 1.5 kg · Tomate 5 unidades.

## Ítems manuales
Los ítems manuales pertenecen a la lista de **una semana** de un usuario y **no se consolidan** con los de recetas.
Aparecen en su góndola como líneas separadas, con la marca "agregado".

```sql
CREATE TABLE shopping_list_manual_items (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL CHECK (date(week_start) = week_start AND strftime('%w', week_start) = '1'),
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  qty        REAL CHECK (qty IS NULL OR qty > 0),
  unit       TEXT CHECK (unit IS NULL OR unit IN ('unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza')),
  aisle      TEXT NOT NULL DEFAULT 'Otros',            -- mismo CHECK de góndolas que recipe_ingredients
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK ((qty IS NULL) = (unit IS NULL))               -- cantidad opcional, pero con unidad si se indica
);
CREATE INDEX shopping_list_manual_items_user_week ON shopping_list_manual_items(user_id, week_start);
```

- Se ordenan junto con los demás ítems de su góndola (alfabéticamente).
- Su `key` es `manual|<id>`, para que el tachado no choque con los ítems de recetas.
- Se pueden agregar aunque la semana no tenga recetas planificadas.

## API
| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/api/shopping-list?week=2026-10-12` (sin `week` = semana actual) | — | 200 `ShoppingList` · 400 si la semana es inválida |
| POST | `/api/shopping-list/:week/items` | `{ "name": "Detergente", "qty": 1, "unit": "unidad", "aisle": "Otros" }` (`qty`, `unit` y `aisle` son opcionales) | 201 `ShoppingItem` · 400 |
| DELETE | `/api/shopping-list/items/:id` | — | 204 · 404 si no existe o es de otro usuario |

```jsonc
// ShoppingList: los grupos van en un arreglo para preservar el orden de las góndolas
{
  "weekStart": "2026-10-12",
  "aisles": [
    {
      "aisle": "Verdulería",
      "items": [
        { "key": "papa|g",        "name": "Papa",   "qty": 1.5, "unit": "kg",     "manual": false },
        { "key": "tomate|unidad", "name": "Tomate", "qty": 5,   "unit": "unidad", "manual": false }
      ]
    },
    {
      "aisle": "Almacén",
      "items": [ { "key": "sal|a gusto", "name": "Sal", "qty": null, "unit": "a gusto", "manual": false } ]
    },
    {
      "aisle": "Otros",
      "items": [ { "key": "manual|3", "id": 3, "name": "Detergente", "qty": 1, "unit": "unidad", "manual": true } ]
    }
  ],
  "customMeals": ["Delivery"]   // comidas libres de la semana, para recordarle al usuario que no suman ingredientes
}
```
Cambios respecto del contrato original: antes la respuesta era un objeto con las góndolas como claves.
Ahora es un arreglo ordenado, y cada ítem tiene una `key` estable para recordar si está tachado.
`ShoppingItem` = un elemento de `items`. Los ítems manuales incluyen su `id`, que se usa para borrarlos.

## Estado de "tachado"
- Se guarda en `localStorage` del dispositivo, con la clave `pc:checked:<userId>:<weekStart>` y un arreglo de `key`s.
- Si cambia el plan y aparece un ítem nuevo, empieza sin tachar. Si un ítem tachado desaparece, se ignora.
- Botón "Destildar todo".
- No se sincroniza entre dispositivos en v1 (decidido).

## UI — `/app/lista?semana=YYYY-MM-DD`
- Se renderiza en el servidor y funciona sin JS. Los checkboxes y su persistencia sí necesitan JS.
- En el celular, las góndolas van en una columna. En la PC, en 2 o 3 columnas (útil para revisar o imprimir antes de salir).
- Un encabezado por góndola. Cada ítem es un checkbox grande (≥ 44 px) con "Nombre — cantidad unidad".
  Al tacharlo, el ítem se baja al final de su góndola con texto tachado y menos opacidad.
- Estado vacío: "No hay recetas planificadas esta semana", con un link al planner (el formulario para agregar ítems se sigue mostrando).
- Al final hay un formulario "Agregar ítem": nombre (obligatorio), cantidad y unidad (opcionales) y góndola (por defecto "Otros").
  Los ítems manuales tienen un botón para borrarlos.
- Una nota fija: "Cantidades para 1 persona por comida. Si comen más, multiplicá."
- Botón "Compartir/Copiar" que copia la lista como texto plano (para mandarla por WhatsApp), usando `navigator.share` o el portapapeles.

## Success Criteria
- [ ] Ejemplo de arriba → resultado exacto (test unitario).
- [ ] La misma receta en 2 turnos → las cantidades se duplican.
- [ ] "Leche 1 l" + "Leche 500 ml" → "Leche 1.5 l"; "Leche 1 l" + "Leche 2 taza" → dos líneas.
- [ ] Tres veces "Sal a gusto" → una sola línea sin cantidad.
- [ ] Nombres con distintas mayúsculas, tildes o espacios se consolidan; "Tomate" y "Tomates" no (v1).
- [ ] Las góndolas salen en el orden de `AISLES` y los ítems ordenados alfabéticamente.
- [ ] Una semana sin entradas ni ítems manuales, o solo con comidas libres → `aisles: []`.
- [ ] Una receta borrada que sigue en el plan aporta sus ingredientes.
- [ ] El usuario B no ve la lista del usuario A para la misma semana.
- [ ] Tachar ítems, recargar la página → siguen tachados. Cambiar de semana → estado independiente.
- [ ] Un ítem manual agregado aparece en su góndola con `manual: true`; no se suma con un ingrediente de receta del mismo nombre.
- [ ] Un ítem manual sin góndola va a "Otros"; `qty` sin `unit` (o al revés) → 400.
- [ ] Una semana con solo ítems manuales muestra solo esos ítems.
- [ ] El usuario B recibe 404 al hacer DELETE sobre un ítem manual del usuario A.
- [ ] Los ítems manuales de una semana no aparecen en otra.
- [ ] Cobertura del 100 % de ramas en `services/shopping-list.ts`.
- [ ] Manual: en el celular, recorrer la lista y tachar 10 ítems con una mano, sin errores de toque.

## Fuera de alcance (v1)
Editar ítems manuales (se borran y se vuelven a crear), marcar "ya tengo en la alacena", precios, sincronizar el tachado entre dispositivos, conversión entre
unidades de volumen y peso, unificar plurales.

## Open Questions
Ninguna.
