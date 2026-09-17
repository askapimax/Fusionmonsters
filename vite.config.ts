import { defineConfig } from 'vitest/config';

// GitHub Pages serves this project from https://<user>.github.io/Fusionmonsters/,
// so production asset URLs need that repo-name prefix. Local dev keeps root
// ('/') so `npm run dev` still works at http://localhost:5173/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Fusionmonsters/' : '/',
  build: {
    rollupOptions: {
      output: {
        // Phaser is by far the largest dependency; splitting it into its own
        // chunk lets it stay cached across deploys where only app code
        // changes, and keeps the app-code chunk itself well under the 500kB
        // warning (the vendor chunk is still large - that's just Phaser).
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}));
