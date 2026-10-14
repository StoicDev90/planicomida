export const DEFAULT_AFTER_LOGIN = '/app/planner';

/**
 * Devuelve `value` si es una ruta interna de la app; si no, '/app/planner'.
 * Válida = empieza con '/app' seguida de fin, '/' o '?', no contiene '//', '\\' ni '..'.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return DEFAULT_AFTER_LOGIN;
  if (!/^\/app(?:[/?]|$)/.test(value)) return DEFAULT_AFTER_LOGIN;
  if (value.includes('//') || value.includes('\\') || value.includes('..'))
    return DEFAULT_AFTER_LOGIN;
  return value;
}
