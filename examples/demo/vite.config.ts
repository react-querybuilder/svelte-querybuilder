import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: [
      // The demo runs against library *source*, not `dist`, so edits under
      // `packages/svelte-querybuilder/src/lib` hot-reload here without a rebuild.
      //
      // The CSS alias is what keeps the demo's own import lines identical to a real consumer's:
      // it lets `src/main.ts` write `svelte-querybuilder/dist/query-builder.css` without
      // requiring `bun run build` to have run first. The package's compiled stylesheet is
      // byte-identical to core's, so pointing at core's is equivalent.
      {
        find: /^svelte-querybuilder\/dist\/(.*)\.css$/,
        replacement: resolve('../../node_modules/@react-querybuilder/core/dist/$1.css'),
      },
      {
        find: /^svelte-querybuilder$/,
        replacement: resolve('../../packages/svelte-querybuilder/src/lib/index.ts'),
      },
    ],
  },
});
