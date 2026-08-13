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
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      thresholds: { lines: 80 },
    },
  },
});
