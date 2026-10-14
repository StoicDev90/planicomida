# Spec: recipes — Catálogo y recetas propias

> Estado: **APROBADA (2026-10-13).** Depende de: `core`, `identity`.
> Reemplaza la parte de recetas de `02-database-and-api.md`.

## Objective
Que el usuario tenga recetas con ingredientes estructurados (nombre, cantidad, unidad y góndola)
para planificar y generar la lista de compras.

**User stories**
- Como usuario, quiero ver un catálogo de recetas sugeridas para no empezar de cero.
- Como usuario, quiero crear mis propias recetas con sus ingredientes.
- Como usuario, quiero editar y borrar mis recetas sin romper los planes que ya las usan.
- Como usuario, quiero filtrar por categoría (desayuno, almuerzo, cena, snack) y buscar por nombre.

## Datos
```sql
CREATE TABLE recipes (
  id         INTEGER PRIMARY KEY,
  owner_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- NULL = receta del catálogo (de todos, solo lectura)
  title      TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  category   TEXT NOT NULL CHECK (category IN ('desayuno', 'almuerzo', 'cena', 'snack')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT                                              -- borrado lógico
);
CREATE INDEX recipes_owner_id ON recipes(owner_id);

CREATE TABLE recipe_ingredients (
  id        INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,                                  -- orden en la receta
  name      TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  qty       REAL CHECK (qty IS NULL OR qty > 0),               -- NULL solo si unit = 'a gusto'
  unit      TEXT NOT NULL CHECK (unit IN ('unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza', 'a gusto')),
  aisle     TEXT NOT NULL CHECK (aisle IN ('Verdulería', 'Carnicería', 'Pescadería', 'Lácteos', 'Panadería',
                                           'Almacén', 'Congelados', 'Bebidas', 'Otros')),
  CHECK ((unit = 'a gusto') = (qty IS NULL))
);
CREATE INDEX recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
```
**Por qué hay una tabla de ingredientes y no `ingredients_json`:** las recetas ahora se pueden editar,
y así la base de datos valida cada ingrediente (unidad, góndola, cantidad). La consolidación también queda más simple.

El orden de las góndolas en el `CHECK` es el orden en que aparecen en la lista de compras (recorrido del súper).

## Reglas
- Un usuario ve las recetas del catálogo (`owner_id IS NULL`) y las suyas. Nunca ve las de otros (404).
- Las recetas del catálogo no se editan ni se borran (403).
- Una receta tiene entre 1 y 30 ingredientes.
- **Las cantidades son para 1 persona.** La app no escala por cantidad de comensales. La UI lo dice explícitamente en el formulario y en el detalle: "Cantidades para 1 persona. Si comen más, multiplicá por la cantidad de personas."
- Al editar, se reemplazan todos los ingredientes dentro de una transacción.
- `DELETE` es lógico (`deleted_at`): la receta desaparece de los listados y no se puede asignar a planes nuevos,
  pero los planes que ya la usan siguen mostrándola, y sus ingredientes siguen contando en la lista de compras.
- Editar una receta cambia todas las semanas donde aparece, incluidas las pasadas (decidido: no se guardan copias).
- Catálogo semilla (`db/seed.sql`, idempotente): al menos 12 recetas típicas, con al menos 2 por categoría
  (ej.: tostadas con queso, avena con fruta, milanesas con puré, tarta de verdura, guiso de lentejas, fideos con tuco,
  ensalada completa, yogur con granola…). Las cantidades son **para 1 persona** y los ingredientes son realistas y
  **se repiten** entre recetas, para que se note la consolidación.

## API
| Método | Ruta | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| GET    | `/api/recipes` | `?category=cena&q=tarta&mine=1` (todos opcionales) | 200 `{ recipes: RecipeSummary[] }`, ordenadas por título |
| GET    | `/api/recipes/:id` | — | 200 `Recipe` · 404 |
| POST   | `/api/recipes` | `RecipeInput` | 201 `Recipe` · 400 |
| PUT    | `/api/recipes/:id` | `RecipeInput` | 200 `Recipe` · 403 catálogo · 404 |
| DELETE | `/api/recipes/:id` | — | 204 · 403 catálogo · 404 |

```jsonc
// RecipeInput
{
  "title": "Tarta de verdura",
  "category": "cena",
  "ingredients": [
    { "name": "Acelga", "qty": 1, "unit": "kg", "aisle": "Verdulería" },
    { "name": "Tapas de tarta", "qty": 1, "unit": "unidad", "aisle": "Almacén" },
    { "name": "Sal", "qty": null, "unit": "a gusto", "aisle": "Almacén" }
  ]
}
// Recipe = RecipeInput + { "id": 7, "isCatalog": false }   (ingredients en el orden de position)
// RecipeSummary = { "id", "title", "category", "isCatalog", "ingredientCount" }
```

## Contrato que expone a otros módulos (`src/services/recipes.ts`)
- `getRecipe(db, userId, id, { includeDeleted }): Recipe | null`: `null` si no existe o no la puede ver.
- `canAssignRecipe(db, userId, id): boolean`: visible y no borrada.
- `AISLES` y `UNITS`: constantes exportadas, en el mismo orden que los `CHECK` del esquema.

## UI
- `/app/recetas`: listado con filtro por categoría, búsqueda y la marca "Catálogo" o "Mía". Botón "Nueva receta".
  En el celular, una columna; en la PC, una grilla de tarjetas de 2 o 3 columnas.
- `/app/recetas/nueva` y `/app/recetas/[id]`: formulario con filas de ingredientes (agregar, quitar, reordenar),
  con selectores de unidad y góndola. Las recetas del catálogo se muestran en solo lectura.

## Success Criteria
- [x] Después de `npm run db:seed`, `GET /api/recipes` devuelve ≥ 12 recetas de catálogo (≥ 2 por categoría); correr el seed dos veces no las duplica.
- [x] Crear una receta con 3 ingredientes → `GET /api/recipes/:id` la devuelve igual (con orden y tipos).
- [x] El usuario B recibe 404 al hacer GET, PUT o DELETE sobre una receta del usuario A.
- [x] PUT o DELETE sobre una receta del catálogo → 403.
- [x] `qty: null` con una unidad distinta de `'a gusto'` → 400; 0 o 31 ingredientes → 400; una góndola o unidad desconocida → 400.
- [x] Una receta borrada no aparece en `GET /api/recipes`, pero `getRecipe(..., { includeDeleted: true })` la devuelve.
- [ ] Manual: crear una receta en el celular (360 px) y en la PC (1280 px) sin scroll horizontal; el aviso "Cantidades para 1 persona" es visible.

## Fuera de alcance (v1)
Duplicar recetas del catálogo, fotos, pasos de preparación, tiempos, escalar por porciones (decidido: todo es para 1 persona), información nutricional, importar recetas desde URL.

## Open Questions
Ninguna.
