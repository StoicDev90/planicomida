import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import { deleteManualItem } from '@/services/shopping-list';

export const DELETE: APIRoute = ({ params, locals }) => {
  const id = Number(params.id);
  const deleted = Number.isInteger(id) && id > 0 && deleteManualItem(getDb(), locals.user!.id, id);
  return deleted
    ? new Response(null, { status: 204 })
    : errorResponse(404, 'NOT_FOUND', 'No existe el ítem');
};
