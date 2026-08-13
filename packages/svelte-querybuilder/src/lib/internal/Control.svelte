<!--
  @component
  Renders a resolved control element, whichever form it takes.

  A control is a component, a snippet wrapped in `{ snippet }`, or `null` for "render nothing".
  Svelte offers no way to tell a snippet from a component at runtime — both are plain functions
  — so the wrapper object is the discriminator: `typeof control === 'function'` means component.

  `props` is forwarded as a single object, matching the snippet's single-argument signature.
-->
<script lang="ts">
  import type { Control } from '../types/controls.js';

  const {
    control,
    props,
    // oxlint-disable-next-line typescript/no-explicit-any
  }: { control: Control<any> | null | undefined; props: any } = $props();
</script>

{#if control == null}
  <!-- Nothing to render. -->
{:else if typeof control === 'function'}
  {@const ControlComponent = control}
  <ControlComponent {...props} />
{:else}
  {@render control.snippet(props)}
{/if}
