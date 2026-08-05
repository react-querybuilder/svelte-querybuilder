<!--
  @component
  Default "shift up"/"shift down" buttons.

  Port of React Query Builder's `ShiftActions`.
-->
<script lang="ts">
  import Label from '../internal/Label.svelte';
  import type { ShiftActionsProps } from '../types/props';

  const {
    testID,
    className,
    disabled,
    labels,
    titles,
    shiftUp,
    shiftDown,
    shiftUpDisabled,
    shiftDownDisabled,
  }: ShiftActionsProps = $props();
</script>

<div data-testid={testID} class={className}>
  <button
    type="button"
    disabled={disabled || shiftUpDisabled}
    onclick={e => shiftUp?.(e)}
    title={titles?.shiftUp}><Label label={labels?.shiftUp} /></button>
  <button
    type="button"
    disabled={disabled || shiftDownDisabled}
    onclick={e => shiftDown?.(e)}
    title={titles?.shiftDown}><Label label={labels?.shiftDown} /></button>
</div>
