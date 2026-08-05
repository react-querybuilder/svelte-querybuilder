<!--
  @component
  Default `<button>` component for every action control.

  Port of React Query Builder's `ActionElement`.
-->
<script lang="ts">
  import Label from '../internal/Label.svelte';
  import type { ActionProps } from '../types/props';

  const {
    label,
    title,
    className,
    disabled,
    disabledTranslation,
    testID,
    handleOnClick,
  }: ActionProps = $props();

  const useDisabledTranslation = $derived(!!disabledTranslation && !!disabled);
  const labelToRender = $derived(useDisabledTranslation ? disabledTranslation?.label : label);
  const titleToRender = $derived(useDisabledTranslation ? disabledTranslation?.title : title);
</script>

<button
  type="button"
  data-testid={testID}
  disabled={disabled && !disabledTranslation}
  class={className}
  title={titleToRender}
  onclick={e => handleOnClick(e)}><Label label={labelToRender} /></button>
