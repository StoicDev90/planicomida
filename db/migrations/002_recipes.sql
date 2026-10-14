CREATE TABLE recipes (
  id         INTEGER PRIMARY KEY,
  owner_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  category   TEXT NOT NULL CHECK (category IN ('desayuno', 'almuerzo', 'cena', 'snack')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT
);
CREATE INDEX recipes_owner_id ON recipes(owner_id);

CREATE TABLE recipe_ingredients (
  id        INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  name      TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  qty       REAL CHECK (qty IS NULL OR qty > 0),
  unit      TEXT NOT NULL CHECK (unit IN ('unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza', 'a gusto')),
  aisle     TEXT NOT NULL CHECK (aisle IN ('Verdulería', 'Carnicería', 'Pescadería', 'Lácteos', 'Panadería',
                                           'Almacén', 'Congelados', 'Bebidas', 'Otros')),
  CHECK ((unit = 'a gusto') = (qty IS NULL))
);
CREATE INDEX recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
