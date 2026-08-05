<!--
  @component
  Default `notToggle` (aka inversion) component.

  Port of React Query Builder's `NotToggle`. React's `useId` becomes `$props.id()`.
-->
<script lang="ts">
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
    {disabled} />{#if typeof label === 'string'}{label}{:else if label}{@render label()}{/if}</label>
