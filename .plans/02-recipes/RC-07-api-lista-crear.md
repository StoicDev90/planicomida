# RC-07 · Endpoints `GET /api/recipes` y `POST /api/recipes`

- **Módulo:** recipes · **Depende de:** RC-05 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-recipes.md` líneas 60–82 (API).
- `.plans/README.md` → "Cómo testear un endpoint".

## Archivos
- Crear: `src/pages/api/recipes/index.ts`
- Crear: `tests/api/recipes.test.ts`

## Contrato — `src/pages/api/recipes/index.ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, fieldErrors, json, parseBody } from '@/lib/http';
import { createRecipe, listRecipes, RecipeInput, RecipeListQuery } from '@/services/recipes';

export const GET: APIRoute = ({ url, locals }) => {
  const query = RecipeListQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) {
    return errorResponse(400, 'VALIDATION', 'Filtros inválidos', fieldErrors(query.error));
  }
  const { category, q, mine } = query.data;
  const recipes = listRecipes(getDb(), locals.user!.id, { category, q, mine: mine === '1' });
  return json({ recipes });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await parseBody(request, RecipeInput);
  if (!body.ok) return body.response;
  return json(createRecipe(getDb(), locals.user!.id, body.data), 201);
};
```

## Tests primero — `tests/api/recipes.test.ts`
Setup estándar + `user = createUser(db)`. Datos: `insertRecipe(db, { title: 'Tarta de verdura', category: 'cena' })`
(catálogo) e `insertRecipe(db, { ownerId: user.id, title: 'Arroz', category: 'almuerzo' })`.
1. `GET /api/recipes` → 200 y `recipes.map(r => r.title)` = `['Arroz', 'Tarta de verdura']`; cada uno con las claves
   `['category', 'id', 'ingredientCount', 'isCatalog', 'title']` (ordenadas).
2. `GET /api/recipes?category=cena` → solo `'Tarta de verdura'`.
3. `GET /api/recipes?mine=1` → solo `'Arroz'`. `GET /api/recipes?q=tarta` → solo `'Tarta de verdura'`.
4. `GET /api/recipes?category=merienda` → 400 con `error.code === 'VALIDATION'` y `error.fields.category` definido.
5. `POST` con el `RecipeInput` del ejemplo de la spec (Tarta de verdura, 3 ingredientes) → 201 y el body es
   ese input más `{ id, isCatalog: false }` (ingredientes en el mismo orden).
6. `POST` con un ingrediente `{ name: 'Acelga', qty: null, unit: 'kg', aisle: 'Verdulería' }` → 400 y
   `error.fields['ingredients.0.qty'] === 'Poné una cantidad, o elegí "a gusto"'`.
7. `POST` con `ingredients: []` → 400; `rawBody: '{x'` → 400.

## Verificación
```bash
npx vitest run tests/api/recipes.test.ts
npx vitest run
npm run check
# Servidor levantado, base sembrada (npm run db:reset y reiniciar), sesión en /tmp/pc.txt (ver README):
curl -s -b /tmp/pc.txt 'http://localhost:4321/api/recipes?category=cena' | head -c 300
```

## Hecho cuando
- [ ] Los 7 casos pasan; el `curl` devuelve las 4 recetas de cena del catálogo.

## Commit
`feat(recipes): RC-07 endpoints para listar y crear recetas`
