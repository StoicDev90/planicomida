/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: { TZ: 'America/Argentina/Buenos_Aires' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
  },
});
