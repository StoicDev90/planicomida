# RC-08 · Endpoints `GET`, `PUT` y `DELETE /api/recipes/:id`

- **Módulo:** recipes · **Depende de:** RC-05 · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-recipes.md` líneas 46–53 (Reglas) y 60–67 (API).

## Archivos
- Crear: `src/pages/api/recipes/[id].ts`
- Crear: `tests/api/recipes-id.test.ts`

## Contrato — `src/pages/api/recipes/[id].ts` (copiar tal cual)
```ts
import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json, parseBody } from '@/lib/http';
import { deleteRecipe, getRecipe, RecipeInput, updateRecipe, type WriteResult } from '@/services/recipes';

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const notFound = () => errorResponse(404, 'NOT_FOUND', 'No existe la receta');

function writeError(result: Extract<WriteResult<unknown>, { ok: false }>): Response {
  return result.error === 'FORBIDDEN'
    ? errorResponse(403, 'FORBIDDEN', 'Las recetas del catálogo no se pueden modificar')
    : notFound();
}

export const GET: APIRoute = ({ params, locals }) => {
  const id = parseId(params.id);
  const recipe = id === null ? null : getRecipe(getDb(), locals.user!.id, id);
  return recipe ? json(recipe) : notFound();
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const id = parseId(params.id);
  if (id === null) return notFound();
  const body = await parseBody(request, RecipeInput);
  if (!body.ok) return body.response;
  const result = updateRecipe(getDb(), locals.user!.id, id, body.data);
  return result.ok ? json(result.value) : writeError(result);
};

export const DELETE: APIRoute = ({ params, locals }) => {
  const id = parseId(params.id);
  if (id === null) return notFound();
  const result = deleteRecipe(getDb(), locals.user!.id, id);
  return result.ok ? new Response(null, { status: 204 }) : writeError(result);
};
```

## Tests primero — `tests/api/recipes-id.test.ts`
Setup estándar + `ana = createUser(db)`, `beto = createUser(db, 'beto@mail.com', 'Beto')`,
`catalogId = insertRecipe(db)`, `anaId = insertRecipe(db, { ownerId: ana.id, title: 'Arroz' })`.
Pasar el id con `params: { id: String(anaId) }`.
1. GET propia → 200 con `title: 'Arroz'`, `isCatalog: false`. GET catálogo → 200 con `isCatalog: true`.
2. GET con `user: beto` sobre `anaId` → 404 `{ error: { code: 'NOT_FOUND', message: 'No existe la receta' } }`.
3. GET con `params: { id: 'abc' }` y con `{ id: '0' }` → 404.
4. PUT propia con un input válido → 200 con los datos nuevos.
5. PUT catálogo → 403 con `error.code === 'FORBIDDEN'`. PUT de Ana pedido por Beto → 404.
6. PUT con body inválido (`title: ''`) → 400 `VALIDATION`.
7. DELETE propia → 204; después GET → 404. DELETE catálogo → 403. DELETE de Ana pedido por Beto → 404.

## Verificación
```bash
npx vitest run tests/api/recipes-id.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 7 casos pasan.

## Commit
`feat(recipes): RC-08 endpoints para ver, editar y borrar una receta`
