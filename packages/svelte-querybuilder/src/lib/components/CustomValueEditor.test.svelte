<!--
  @component
  Test-only replacement `valueEditor` component, passed through the `controls` prop. Named
  `*.test.svelte` so the build strips it from `dist`.
-->
<script lang="ts">
  import type { ValueEditorProps } from '../types/props.js';

  const props: ValueEditorProps = $props();
</script>

<input
  data-testid="custom-component-value-editor"
  value={props.value}
  oninput={e => props.handleOnChange(e.currentTarget.value)} />
