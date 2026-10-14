import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json, parseBody } from '@/lib/http';
import { WeekStart } from '@/lib/week';
import { addManualItem, ManualItemInput, manualToItem } from '@/services/shopping-list';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const week = WeekStart.safeParse(params.week);
  if (!week.success) {
    return errorResponse(400, 'VALIDATION', 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)');
  }
  const body = await parseBody(request, ManualItemInput);
  if (!body.ok) return body.response;
  const item = addManualItem(getDb(), locals.user!.id, week.data, body.data);
  return json(manualToItem(item), 201);
};
