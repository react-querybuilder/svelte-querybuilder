<!--
  @component
  Renders a {@link LabelNode}—a plain string or a zero-argument snippet.

  Every translatable label in this package accepts `Snippet | string`, so every render site
  needs the same two-branch dance. This is that dance, factored out.

  Renders nothing for `undefined`/`null`. Emits no wrapper element and no whitespace, so it is
  safe to use inline where the surrounding DOM structure matters.
-->
<script lang="ts">
  import type { LabelNode } from '../types/translations';

  const { label }: { label?: LabelNode | null } = $props();
</script>

{#if typeof label === 'string'}{label}{:else if label}{@render label()}{/if}
