export interface RateLimiter {
  /** true si la clave ya tiene `max` fallos dentro de la ventana. */
  isBlocked(key: string, now?: number): boolean;
  recordFailure(key: string, now?: number): void;
  /** Olvida los fallos de la clave (después de un login exitoso). */
  reset(key: string): void;
}

export function createRateLimiter(options: { max: number; windowMs: number }): RateLimiter {
  const { max, windowMs } = options;
  const failures = new Map<string, number[]>();

  function prune(key: string, now: number): number[] {
    const recent = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length > 0) failures.set(key, recent);
    else failures.delete(key);
    return recent;
  }

  return {
    isBlocked(key, now = Date.now()) {
      return prune(key, now).length >= max;
    },
    recordFailure(key, now = Date.now()) {
      const recent = prune(key, now);
      recent.push(now);
      failures.set(key, recent);
    },
    reset(key) {
      failures.delete(key);
    },
  };
}

/** Instancia única para el login: 10 fallos cada 15 minutos. */
export const loginLimiter: RateLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
});
