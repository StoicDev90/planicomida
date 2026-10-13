# Spec 02: Base de Datos y Contratos de API - PlaniComida

## 1. Esquema de Base de Datos (SQLite)

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT CHECK(category IN ('almuerzo', 'cena', 'desayuno', 'snack')),
    ingredients_json TEXT NOT NULL, -- Array JSON: [{"name": "Tomate", "qty": 2, "unit": "unidades", "category": "Verdulería"}]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    day_of_week TEXT CHECK(day_of_week IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
    meal_type TEXT CHECK(meal_type IN ('almuerzo', 'cena')),
    recipe_id INTEGER,
    custom_meal_name TEXT,
    FOREIGN KEY(recipe_id) REFERENCES recipes(id)
);
```

## 2. Endpoints de la API REST (Express)

-   `GET /api/recipes` -> Obtener catalogo de recetas sugeridas.
-   `GET /api/plan` -> Obtener el plan de la semana del usuario.
-   `POST /api/plan` -> Asignar/Editar una comida en un dia/turno especifico.
-   `DELETE /api/plan/:id` -> Eliminar una comida del plan.
-   `GET /api/shopping-list` -> **Lógica Central:** Retorna los ingredientes consolidados y agrupados por categoría.

### Estructura de Respuesta de `/api/shopping-list`:
```json
{
  "Verduleria": [
    { "name": "Tomate", "total_qty": 5, "unit": "unidades" }
  ],
  "Carniceria": [
    { "name": "Pollo", "total_qty": 1, "unit": "kg" }
  ]
}
```
