import { describe, expect, it } from 'vitest';
import { createRateLimiter, loginLimiter } from '@/lib/rate-limit';

describe('rate-limit', () => {
  it('una clave sin fallos no está bloqueada', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });
    expect(limiter.isBlocked('k', 0)).toBe(false);
  });

  it('bloquea al llegar a max fallos dentro de la ventana', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });
    limiter.recordFailure('k', 0);
    limiter.recordFailure('k', 100);
    expect(limiter.isBlocked('k', 200)).toBe(false);
    limiter.recordFailure('k', 200);
    expect(limiter.isBlocked('k', 300)).toBe(true);
  });

  it('la ventana vence y los fallos viejos dejan de contar', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });
    limiter.recordFailure('k', 0);
    limiter.recordFailure('k', 1);
    limiter.recordFailure('k', 2);
    expect(limiter.isBlocked('k', 1002)).toBe(false);
  });

  it('las claves son independientes', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });
    limiter.recordFailure('a', 0);
    limiter.recordFailure('a', 1);
    limiter.recordFailure('a', 2);
    expect(limiter.isBlocked('a', 10)).toBe(true);
    expect(limiter.isBlocked('b', 10)).toBe(false);
  });

  it('reset olvida los fallos de la clave', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });
    limiter.recordFailure('k', 0);
    limiter.recordFailure('k', 1);
    limiter.recordFailure('k', 2);
    limiter.reset('k');
    expect(limiter.isBlocked('k', 10)).toBe(false);
  });

  it('loginLimiter permite 9 fallos y bloquea el 10.º', () => {
    const key = 'ip|x';
    for (let i = 0; i < 9; i++) loginLimiter.recordFailure(key, 0);
    expect(loginLimiter.isBlocked(key, 0)).toBe(false);
    loginLimiter.recordFailure(key, 0);
    expect(loginLimiter.isBlocked(key, 0)).toBe(true);
    loginLimiter.reset(key);
  });
});
