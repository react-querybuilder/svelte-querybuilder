<!--
  @component
  Default `inlineCombinator` component. A small `<div>` wrapper around the `combinatorSelector`
  component, used when either `showCombinatorsBetweenRules` or independent combinators are in
  play.

  Port of React Query Builder's `InlineCombinator`.
-->
<script lang="ts">
  import { clsx, standardClassnames, TestID } from '@react-querybuilder/core';
  import type { CombinatorSelectorProps, InlineCombinatorProps } from '../types/props';

  const { component, ...props }: InlineCombinatorProps = $props();

  const CombinatorSelectorComponent = $derived(component);

  const className = $derived(
    clsx(
      props.schema.suppressStandardClassnames || standardClassnames.betweenRules,
      props.schema.classNames.betweenRules
    )
  );

  const selectorProps = $derived(props as CombinatorSelectorProps);
</script>

<div class={className} data-testid={TestID.inlineCombinator}>
  <CombinatorSelectorComponent {...selectorProps} testID={TestID.combinators} />
</div>
