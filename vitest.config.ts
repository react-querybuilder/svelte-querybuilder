import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*/vite.config.ts'],
    // Coverage is resolved from the root config only; the identical block in the package's
    // `vite.config.ts` is inert when the suite runs through `projects`, which is how CI runs it.
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/lib/**'],
      exclude: ['**/*.{test,spec,test-d}.*'],
      thresholds: { lines: 80 },
    },
  },
});
