# ID-07 · Rate limit de login en memoria

- **Módulo:** identity · **Depende de:** — · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-identity.md` línea 46 (10 intentos fallidos cada 15 minutos por IP+email → 429).

## Archivos
- Crear: `src/lib/rate-limit.ts`
- Crear: `tests/lib/rate-limit.test.ts`

## Contrato — `src/lib/rate-limit.ts`
```ts
export interface RateLimiter {
  /** true si la clave ya tiene `max` fallos dentro de la ventana. */
  isBlocked(key: string, now?: number): boolean;
  recordFailure(key: string, now?: number): void;
  /** Olvida los fallos de la clave (después de un login exitoso). */
  reset(key: string): void;
}

export function createRateLimiter(options: { max: number; windowMs: number }): RateLimiter;

/** Instancia única para el login: 10 fallos cada 15 minutos. */
export const loginLimiter: RateLimiter;
```
Implementación: un `Map<string, number[]>` con los timestamps (ms) de los fallos. En `isBlocked` y
`recordFailure`, primero descartar los timestamps con `now - t >= windowMs`. `now` por defecto `Date.now()`.

## Tests primero — `tests/lib/rate-limit.test.ts`
`const limiter = createRateLimiter({ max: 3, windowMs: 1000 })` (uno nuevo por test).
1. Clave sin fallos → `isBlocked('k', 0) === false`.
2. 2 fallos (t=0, t=100) → `isBlocked('k', 200) === false`; un 3er fallo (t=200) → `isBlocked('k', 300) === true`.
3. La ventana vence: 3 fallos en t=0,1,2 → `isBlocked('k', 1002) === false` (los tres tienen ≥ 1000 ms).
4. Claves independientes: 3 fallos en `'a'` → `isBlocked('b', 10) === false`.
5. `reset('k')` después de 3 fallos → `isBlocked('k', 10) === false`.
6. `loginLimiter`: 9 fallos de `'ip|x'` → no bloqueado; el 10.º → bloqueado (usar `now` fijo; llamar `loginLimiter.reset('ip|x')` al final).

## Verificación
```bash
npx vitest run tests/lib/rate-limit.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 6 casos pasan.

## Commit
`feat(identity): ID-07 rate limit de login en memoria`
