CREATE TABLE meal_plan_entries (
  id               INTEGER PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start       TEXT NOT NULL CHECK (date(week_start) = week_start AND strftime('%w', week_start) = '1'),
  day              INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  meal_type        TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'snack', 'cena')),
  recipe_id        INTEGER REFERENCES recipes(id),
  custom_meal_name TEXT CHECK (custom_meal_name IS NULL OR length(custom_meal_name) BETWEEN 1 AND 80),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK ((recipe_id IS NULL) <> (custom_meal_name IS NULL)),
  UNIQUE (user_id, week_start, day, meal_type)
);
