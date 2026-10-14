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
