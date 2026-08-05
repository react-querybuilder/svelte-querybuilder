<!--
  @component
  Internal adapter that lets a snippet stand in for a control element component.

  `snippetToComponent` wraps this so that `{@render}`-style customization can flow through the
  same `Controls` object as `controlElements`. `props` is the props object handed to the
  component by its parent, forwarded verbatim so property reads stay reactive.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  const {
    snippet,
    props,
    // oxlint-disable-next-line typescript/no-explicit-any
  }: { snippet: Snippet<[any]>; props: any } = $props();
</script>

{@render snippet(props)}
