import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./vitest-setup.ts'],
    // Must live here, not in the root config: root-level `test` options are NOT inherited by
    // `projects` configs, which is how CI runs the suite. (`coverage` is the exception and goes
    // the other way — see the note in the root `vitest.config.ts`.)
    //
    // The a11y suite is the slowest in the repo and CI runners are 2-core, so the 5s default is
    // too tight even though no single case is near this. Headroom, not a budget.
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      thresholds: { lines: 80 },
    },
  },
});
