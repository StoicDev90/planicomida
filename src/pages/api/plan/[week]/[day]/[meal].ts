import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json, parseBody } from '@/lib/http';
import { clearMeal, SetMealBody, setMeal, SlotParams } from '@/services/plan';

const invalidSlot = () => errorResponse(400, 'VALIDATION', 'Semana, día o comida inválidos');

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const slot = SlotParams.safeParse(params);
  if (!slot.success) return invalidSlot();

  const body = await parseBody(request, SetMealBody);
  if (!body.ok) return body.response;

  const result = setMeal(getDb(), locals.user!.id, slot.data, body.data);
  return result.ok ? json(result.entry) : errorResponse(404, 'NOT_FOUND', 'No existe la receta');
};

export const DELETE: APIRoute = ({ params, locals }) => {
  const slot = SlotParams.safeParse(params);
  if (!slot.success) return invalidSlot();
  clearMeal(getDb(), locals.user!.id, slot.data);
  return new Response(null, { status: 204 });
};
