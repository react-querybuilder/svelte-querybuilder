import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
  kit: {
    // Pinned rather than `adapter-auto` so `vite preview` behaves identically in CI and locally.
    adapter: adapter(),
  },
};
