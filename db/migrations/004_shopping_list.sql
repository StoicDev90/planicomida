CREATE TABLE shopping_list_manual_items (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL CHECK (date(week_start) = week_start AND strftime('%w', week_start) = '1'),
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  qty        REAL CHECK (qty IS NULL OR qty > 0),
  unit       TEXT CHECK (unit IS NULL OR unit IN ('unidad', 'g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza')),
  aisle      TEXT NOT NULL DEFAULT 'Otros' CHECK (aisle IN ('Verdulería', 'Carnicería', 'Pescadería', 'Lácteos',
                                                            'Panadería', 'Almacén', 'Congelados', 'Bebidas', 'Otros')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK ((qty IS NULL) = (unit IS NULL))
);
CREATE INDEX shopping_list_manual_items_user_week ON shopping_list_manual_items(user_id, week_start);
