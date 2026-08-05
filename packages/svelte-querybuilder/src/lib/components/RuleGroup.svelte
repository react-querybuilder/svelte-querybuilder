<!--
  @component
  Default component for `RuleGroupType` and `RuleGroupTypeIC` objects.

  Port of React Query Builder's `RuleGroup`. The header and body controls live in
  `RuleGroupHeader.svelte`/`RuleGroupBody.svelte`, which are internal rather than control
  elements; `Rule` reuses them to render a subquery.

  Nested groups and rules are rendered through `schema.controls`, so this component never
  imports itself and replacement components apply at every level.
-->
<script lang="ts" generics="F extends FullOption = FullOption, O extends string = string">
  import type { FullOption } from '@react-querybuilder/core';
  import { TestID } from '@react-querybuilder/core';
  import { createRuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleGroupProps } from '../types/props.js';
  import RuleGroupBody from './RuleGroupBody.svelte';
  import RuleGroupHeader from './RuleGroupHeader.svelte';

  const props: RuleGroupProps<F, O> = $props();

  const parts = createRuleGroupParts(() => props);
</script>

<div
  title={parts.accessibleDescription}
  class={parts.outerClassName}
  data-testid={TestID.ruleGroup}
  data-not={parts.ruleGroup.not ? 'true' : undefined}
  data-rule-group-id={props.id}
  data-level={props.path.length}
  data-path={JSON.stringify(props.path)}>
  <div class={parts.classNames.header}>
    <RuleGroupHeader {props} {parts} />
  </div>
  <div class={parts.classNames.body}>
    <RuleGroupBody {props} {parts} />
  </div>
</div>
