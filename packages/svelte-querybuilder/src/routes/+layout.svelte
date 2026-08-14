<!--
  @component
  Root layout for the development playground. Not published: `svelte-package` only reads
  `src/lib`, so everything under `src/routes` exists solely to run the library against a real
  SvelteKit app while developing it.

  The stylesheets are imported from *source*, not from `dist`, so a change to
  `src/lib/styles/_svelte.scss` hot-reloads without a `bun run build:css`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import '@react-querybuilder/core/dist/query-builder.scss';
  import '$lib/styles/_svelte.scss';
  import './playground.css';

  const { children }: { children: Snippet } = $props();
</script>

{@render children()}
