<!--
  @component
  Default component for `RuleType` objects.

  Port of React Query Builder's `Rule`. A thin wrapper around `RuleComponents.svelte`, or around
  `RuleSubQuery.svelte` when the rule's field supports match modes.
-->
<script lang="ts" generics="F extends string = string, O extends string = string">
  import { TestID } from '@react-querybuilder/core';
  import { createRuleParts } from '../reactive/ruleParts.svelte.js';
  import type { RuleProps } from '../types/props.js';
  import RuleComponents from './RuleComponents.svelte';
  import RuleSubQuery from './RuleSubQuery.svelte';

  const props: RuleProps<F, O> = $props();

  const parts = createRuleParts(() => props);
</script>

<div
  data-testid={TestID.rule}
  class={parts.outerClassName}
  data-rule-id={props.id}
  data-level={props.path.length}
  data-path={JSON.stringify(props.path)}>
  {#if parts.hasSubQuery}
    <RuleSubQuery {props} {parts} />
  {:else}
    <RuleComponents {props} {parts} />
  {/if}
</div>
