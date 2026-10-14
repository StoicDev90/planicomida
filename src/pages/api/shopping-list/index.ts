import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json } from '@/lib/http';
import { WeekStart, weekStartOf } from '@/lib/week';
import { getShoppingList } from '@/services/shopping-list';

export const GET: APIRoute = ({ url, locals }) => {
  const raw = url.searchParams.get('week');
  let week = weekStartOf(new Date());
  if (raw !== null) {
    const parsed = WeekStart.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(
        400,
        'VALIDATION',
        'La semana debe ser la fecha de un lunes (YYYY-MM-DD)',
      );
    }
    week = parsed.data;
  }
  return json(getShoppingList(getDb(), locals.user!.id, week));
};
