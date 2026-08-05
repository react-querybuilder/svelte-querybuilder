import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

/**
 * The conformance suites run separately from the unit tests: they depend on fixture files that
 * are gitignored and fetched on demand (`bun run conformance`), so including them in the default
 * `vitest run` would make a fresh clone fail for a reason unrelated to the code.
 */
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  test: {
    name: 'conformance',
    environment: 'jsdom',
    globals: true,
    include: ['test/conformance/**/*.test.ts'],
    setupFiles: ['./vitest-setup.ts'],
  },
});
