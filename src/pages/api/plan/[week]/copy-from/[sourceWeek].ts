import type { APIRoute } from 'astro';
import { getDb } from '@/lib/db';
import { errorResponse, json } from '@/lib/http';
import { WeekStart } from '@/lib/week';
import { copyWeek, getWeekPlan } from '@/services/plan';

export const POST: APIRoute = ({ params, locals }) => {
  const target = WeekStart.safeParse(params.week);
  const source = WeekStart.safeParse(params.sourceWeek);
  if (!target.success || !source.success) {
    return errorResponse(400, 'VALIDATION', 'La semana debe ser la fecha de un lunes (YYYY-MM-DD)');
  }
  if (target.data === source.data) {
    return errorResponse(400, 'VALIDATION', 'No se puede copiar una semana sobre sí misma');
  }
  const db = getDb();
  const userId = locals.user!.id;
  const { copied, skipped } = copyWeek(db, userId, target.data, source.data);
  return json({ copied, skipped, plan: getWeekPlan(db, userId, target.data) });
};
