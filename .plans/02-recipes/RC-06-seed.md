# RC-06 · Catálogo semilla `db/seed.sql`

- **Módulo:** recipes · **Depende de:** RC-01 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-recipes.md` líneas 50 y 55–58 (cantidades para 1 persona, ≥ 12 recetas, ≥ 2 por categoría, idempotente).
- `scripts/lib.ts` (`runSeed` ejecuta este archivo completo con `db.exec`).

## Archivos
- Crear: `db/seed.sql`
- Crear: `tests/db/seed.test.ts`

## Contrato — `db/seed.sql`
Formato (idempotente con ids fijos e `INSERT OR IGNORE`):
```sql
-- Catálogo de PlaniComida. Cantidades para 1 persona. Idempotente: ids fijos + INSERT OR IGNORE.
INSERT OR IGNORE INTO recipes (id, owner_id, title, category) VALUES
  (1, NULL, 'Tostadas con queso', 'desayuno'),
  ...;

INSERT OR IGNORE INTO recipe_ingredients (id, recipe_id, position, name, qty, unit, aisle) VALUES
  (100, 1, 0, 'Pan francés', 100, 'g', 'Panadería'),
  (101, 1, 1, 'Queso cremoso', 40, 'g', 'Lácteos'),
  ...;
```
Id de ingrediente = `recipe_id * 100 + position`. Para "a gusto", `qty` es `NULL`.

Contenido exacto (receta → ingredientes en orden: nombre, qty, unidad, góndola):

| id | Título | Categoría | Ingredientes |
|----|--------|-----------|--------------|
| 1 | Tostadas con queso | desayuno | Pan francés 100 g Panadería · Queso cremoso 40 g Lácteos · Leche 200 ml Lácteos |
| 2 | Avena con banana | desayuno | Avena 50 g Almacén · Leche 200 ml Lácteos · Banana 1 unidad Verdulería · Miel 1 cda Almacén |
| 3 | Huevos revueltos con tostadas | desayuno | Huevo 2 unidad Almacén · Pan francés 60 g Panadería · Manteca 10 g Lácteos · Sal NULL a gusto Almacén |
| 4 | Fideos con tuco | almuerzo | Fideos secos 120 g Almacén · Tomate 2 unidad Verdulería · Cebolla 1 unidad Verdulería · Ajo 1 unidad Verdulería · Queso rallado 20 g Lácteos · Aceite 1 cda Almacén · Sal NULL a gusto Almacén |
| 5 | Milanesas con puré | almuerzo | Nalga para milanesa 200 g Carnicería · Huevo 1 unidad Almacén · Pan rallado 60 g Almacén · Papa 300 g Verdulería · Leche 50 ml Lácteos · Manteca 10 g Lácteos · Sal NULL a gusto Almacén |
| 6 | Ensalada completa | almuerzo | Lechuga 100 g Verdulería · Tomate 1 unidad Verdulería · Zanahoria 1 unidad Verdulería · Huevo 1 unidad Almacén · Aceite 1 cda Almacén · Sal NULL a gusto Almacén |
| 7 | Arroz con pollo | almuerzo | Arroz 80 g Almacén · Pollo (pata muslo) 250 g Carnicería · Morrón 0.5 unidad Verdulería · Cebolla 1 unidad Verdulería · Caldo en cubo 0.5 unidad Almacén · Sal NULL a gusto Almacén |
| 8 | Tarta de verdura | cena | Acelga 250 g Verdulería · Cebolla 1 unidad Verdulería · Huevo 1 unidad Almacén · Queso cremoso 60 g Lácteos · Tapa de tarta 0.5 unidad Almacén |
| 9 | Guiso de lentejas | cena | Lentejas 90 g Almacén · Chorizo colorado 1 unidad Carnicería · Papa 150 g Verdulería · Cebolla 1 unidad Verdulería · Tomate 1 unidad Verdulería · Morrón 0.5 unidad Verdulería · Pimentón 1 cdta Almacén |
| 10 | Pollo al horno con papas | cena | Pollo (pata muslo) 300 g Carnicería · Papa 300 g Verdulería · Cebolla 1 unidad Verdulería · Aceite 1 cda Almacén · Sal NULL a gusto Almacén |
| 11 | Merluza con ensalada | cena | Filet de merluza 200 g Pescadería · Limón 0.5 unidad Verdulería · Lechuga 80 g Verdulería · Tomate 1 unidad Verdulería · Aceite 1 cda Almacén |
| 12 | Yogur con granola | snack | Yogur natural 200 g Lácteos · Granola 40 g Almacén · Banana 1 unidad Verdulería |
| 13 | Café con leche y medialunas | snack | Leche 200 ml Lácteos · Café 1 cda Almacén · Medialunas 2 unidad Panadería |
| 14 | Licuado de banana | snack | Banana 1 unidad Verdulería · Leche 250 ml Lácteos · Azúcar 1 cdta Almacén |

## Tests primero — `tests/db/seed.test.ts`
```ts
import { readFileSync } from 'node:fs';
const SEED = readFileSync('db/seed.sql', 'utf8');
```
`beforeEach`: `db = createTestDb(); db.exec(SEED);`
1. 14 recetas, todas con `owner_id IS NULL`.
2. Por categoría (`GROUP BY category`): desayuno 3, almuerzo 4, cena 4, snack 3 (todas ≥ 2).
3. Toda receta tiene ≥ 1 ingrediente (`SELECT count(*) FROM recipes r WHERE NOT EXISTS (SELECT 1 FROM recipe_ingredients i WHERE i.recipe_id = r.id)` → 0).
4. Idempotente: `db.exec(SEED)` otra vez → siguen 14 recetas y la misma cantidad de ingredientes.
5. Hay ingredientes repetidos entre recetas: al menos 8 nombres aparecen en 2 o más recetas
   (`SELECT name FROM recipe_ingredients GROUP BY name HAVING COUNT(DISTINCT recipe_id) >= 2`).
6. Con el service: `listRecipes(db, createUser(db).id)` devuelve 14 resúmenes con `isCatalog: true`.

## Verificación
```bash
npx vitest run tests/db/seed.test.ts
npx vitest run
npm run check
npm run db:reset    # borra la base de desarrollo, migra y siembra (reiniciar el servidor después)
npm run db:seed     # segunda vez: no falla ni duplica
```

## Hecho cuando
- [ ] Los 6 casos pasan y `db:reset` + `db:seed` corren sin error.

## Commit
`feat(recipes): RC-06 catálogo semilla de 14 recetas para 1 persona`
