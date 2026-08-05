<script lang="ts">
  import 'svelte-querybuilder/dist/query-builder.css';

  let { children } = $props();
</script>

{@render children()}
