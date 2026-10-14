import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json, parseBody } from '@/lib/http';
import {
  deleteRecipe,
  getRecipe,
  RecipeInput,
  updateRecipe,
  type WriteResult,
} from '@/services/recipes';

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
