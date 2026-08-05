<!--
  @component
  Default `notToggle` (aka inversion) component.

  Port of React Query Builder's `NotToggle`.
-->
<script lang="ts">
  import Label from '../internal/Label.svelte';
  import type { NotToggleProps } from '../types/props';

  const { testID, className, title, label, checked, disabled, handleOnChange }: NotToggleProps =
    $props();

  const id = $props.id();
</script>

<label data-testid={testID} class={className} {title} for={id}
  ><input
    {id}
    type="checkbox"
    onchange={e => handleOnChange(e.currentTarget.checked)}
    checked={!!checked}
    {disabled} /><Label {label} /></label>
