import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

/**
 * Serves the development playground under `src/routes`. Nothing published goes through here —
 * `svelte-package` reads `src/lib` directly, but takes `preprocess` and `compilerOptions` from
 * this file (Kit 3 dropped `svelte.config.js`).
 *
 * The test runner deliberately does *not* share this config: `sveltekit()` resolves the Kit
 * project relative to the process's working directory, which is the monorepo root when Vitest
 * runs the package as a `projects` entry. See `vitest.config.ts`.
 */
export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      // Runes-only components.
      compilerOptions: { runes: true },
      // Pinned rather than `adapter-auto`; the playground is never deployed, so this exists only
      // to keep `vite build` from failing on a missing adapter.
      adapter: adapter(),
    }),
  ],
});
