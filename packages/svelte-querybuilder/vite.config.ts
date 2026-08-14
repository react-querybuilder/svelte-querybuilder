import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * Serves the development playground under `src/routes`. Nothing published goes through here —
 * `svelte-package` reads `src/lib` directly.
 *
 * The test runner deliberately does *not* share this config: `sveltekit()` resolves the Kit
 * project relative to the process's working directory, which is the monorepo root when Vitest
 * runs the package as a `projects` entry. See `vitest.config.ts`.
 */
export default defineConfig({
  plugins: [sveltekit()],
});
