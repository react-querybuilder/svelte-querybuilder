<!--
  @component
  Default "shift up"/"shift down" buttons.

  Port of React Query Builder's `ShiftActions`.
-->
<script lang="ts">
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
    title={titles?.shiftUp}
    >{#if typeof labels?.shiftUp === 'string'}{labels.shiftUp}{:else if labels?.shiftUp}{@render labels.shiftUp()}{/if}</button>
  <button
    type="button"
    disabled={disabled || shiftDownDisabled}
    onclick={e => shiftDown?.(e)}
    title={titles?.shiftDown}
    >{#if typeof labels?.shiftDown === 'string'}{labels.shiftDown}{:else if labels?.shiftDown}{@render labels.shiftDown()}{/if}</button>
</div>
