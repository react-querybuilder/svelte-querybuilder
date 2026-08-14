import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit config, but the Kit app is only the development playground under `src/routes` —
 * `svelte-package` reads `src/lib` and ignores everything here except `preprocess` and
 * `compilerOptions`.
 *
 * @type {import('@sveltejs/kit').Config}
 */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Runes-only components.
    runes: true,
  },
  kit: {
    // Pinned rather than `adapter-auto`; the playground is never deployed, so this exists only
    // to keep `vite build` from failing on a missing adapter.
    adapter: adapter(),
  },
};
