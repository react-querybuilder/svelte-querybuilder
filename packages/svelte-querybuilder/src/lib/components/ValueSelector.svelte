<!--
  @component
  Default `<select>` component for every selector control (combinator, field, operator, value
  source, and list-based value editors).

  Port of React Query Builder's `ValueSelector`, with `useValueSelector` and
  `useSelectElementChangeHandler` folded in—neither does anything a `$derived` doesn't.
-->
<script lang="ts">
  import {
    getValueSelectorUpdate,
    isOptionGroupArray,
    normalizeValueSelectorValue,
  } from '@react-querybuilder/core';
  import type { ValueSelectorProps } from '../types/props';

  const {
    testID,
    className,
    title,
    disabled,
    multiple,
    listsAsArrays = false,
    options,
    value,
    handleOnChange,
  }: ValueSelectorProps = $props();

  const val = $derived(normalizeValueSelectorValue(value, multiple));

  const onchange = (event: Event & { currentTarget: HTMLSelectElement }) => {
    const next = multiple
      ? Array.from(event.currentTarget.selectedOptions, o => o.value)
      : event.currentTarget.value;
    handleOnChange(getValueSelectorUpdate(next, { multiple, listsAsArrays }));
  };
</script>

<select
  data-testid={testID}
  class={className}
  value={val}
  {title}
  {disabled}
  multiple={!!multiple}
  {onchange}>
  {#if isOptionGroupArray(options)}
    {#each options as og (og.label)}
      <optgroup label={og.label}>
        {#each og.options as opt (opt.name)}
          <option value={opt.name} disabled={opt.disabled}>{opt.label}</option>
        {/each}
      </optgroup>
    {/each}
  {:else if Array.isArray(options)}
    {#each options as opt (opt.name)}
      <option value={opt.name} disabled={opt.disabled}>{opt.label}</option>
    {/each}
  {/if}
</select>
