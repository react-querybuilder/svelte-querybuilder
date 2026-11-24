<!--
  @component
  Renders a resolved control element, whichever form it takes.

  A control is a component, a snippet wrapped in `{ snippet }`, or `null` for "render nothing".
  Svelte offers no way to tell a snippet from a component at runtime — both are plain functions
  — so the wrapper object is the discriminator: `typeof control === 'function'` means component.

  `props` is forwarded as a single object, matching the snippet's single-argument signature.
-->
<script lang="ts" generics="P extends Record<string, unknown>">
  import type { Control } from '../types/controls.js';

  const { control, props }: { control: Control<P> | null | undefined; props: P } = $props();
</script>

{#if control == null}
  <!-- Nothing to render. -->
{:else if typeof control === 'function'}
  {@const ControlComponent = control}
  <ControlComponent {...props} />
{:else}
  {@render control.snippet(props)}
{/if}
