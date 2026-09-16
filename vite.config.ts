import { defineConfig } from 'vitest/config';

// GitHub Pages serves this project from https://<user>.github.io/Fusionmonsters/,
// so production asset URLs need that repo-name prefix. Local dev keeps root
// ('/') so `npm run dev` still works at http://localhost:5173/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Fusionmonsters/' : '/',
  test: {
    include: ['src/**/*.test.ts'],
  },
}));
