// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
  // Fuentes servidas desde el propio sitio (se descargan en el build).
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Imbue',
      cssVariable: '--font-imbue',
      weights: [400],
      subsets: ['latin'],
      fallbacks: ['serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Albert Sans',
      cssVariable: '--font-albert',
      weights: [400, 500, 600],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],
});
