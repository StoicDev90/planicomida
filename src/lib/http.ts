import { z } from 'astro/zod';

export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): Response {
  return json({ error: fields ? { code, message, fields } : { code, message } }, status);
}

/** Primer mensaje de error por campo; la clave es la ruta con puntos ("ingredients.0.name") o "_". */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: errorResponse(400, 'VALIDATION', 'El cuerpo no es JSON válido') };
  }

  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    response: errorResponse(400, 'VALIDATION', 'Hay datos inválidos', fieldErrors(result.error)),
  };
}
