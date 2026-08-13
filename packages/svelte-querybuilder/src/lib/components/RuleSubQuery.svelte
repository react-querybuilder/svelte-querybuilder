<!--
  @component
  A rule whose field supports match modes (see `getMatchModes`), i.e. one whose `value` is
  itself a query.

  Port of React Query Builder's `RuleComponentsWithSubQuery`. It is a separate component because
  the subquery needs its own query-builder state, and that state can only be created during
  component initialization, so it cannot live behind a conditional inside `Rule`.

  The subquery is fully controlled by `rule.value`—every change is written back through
  `onChangeValue`.
-->
<script lang="ts">
  import type { FullField, FullOption, RuleGroupType } from '@react-querybuilder/core';
  import { isRuleGroup, prepareOptionList, rootPath } from '@react-querybuilder/core';
  import { createQueryBuilderState } from '../reactive/createQueryBuilderState.svelte.js';
  import { createRuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleParts } from '../reactive/ruleParts.svelte.js';
  import type { QueryBuilderProps, RuleGroupProps, RuleProps } from '../types/props.js';
  import RuleComponents from './RuleComponents.svelte';

  const defaultSubproperties: FullOption[] = [{ name: '', value: '', label: '' }];

  const { props, parts }: { props: RuleProps; parts: RuleParts } = $props();

  const schema = $derived(props.schema);

  const subQueryBuilderProps = $derived(
    schema.getSubQueryBuilderProps(props.rule.field as never, {
      fieldData: parts.fieldData as never,
    }) as Record<string, unknown>
  );

  const subproperties = $derived(
    prepareOptionList<FullField>({
      placeholder: props.translations.fields,
      optionList: (parts.fieldData.subproperties ??
        subQueryBuilderProps.fields ??
        defaultSubproperties) as never,
      autoSelectOption: schema.autoSelectField || !!parts.fieldData.subproperties,
    }).optionList
  );

  // The rule's `value` is the subquery. Anything but a group leaves `query` undefined and lets
  // the subquery seed itself; a seeded query is emitted once during initialization, which writes
  // it back through `onChangeValue`. A group without an `id` is passed through all the same —
  // query-state initialization prepares it and emits the normalized result, so its existing
  // rules survive.
  const subQuery = $derived(
    isRuleGroup(props.rule.value) ? (props.rule.value as RuleGroupType) : undefined
  );

  const subQueryProps = $derived({
    ...subQueryBuilderProps,
    disabled: parts.disabled,
    fields: subproperties,
    query: subQuery,
    onQueryChange: parts.onChangeValue,
  } as QueryBuilderProps);

  const subState = createQueryBuilderState(() => subQueryProps);

  const subGroupProps = $derived({
    id: subState.rootGroup.id,
    path: rootPath,
    ruleGroup: subState.rootGroup,
    schema: subState.schema,
    actions: subState.actions,
    translations: subState.translations,
    disabled: parts.disabled,
    parentDisabled: subState.queryDisabled,
    shiftUpDisabled: true,
    shiftDownDisabled: true,
    context: props.context,
  } as RuleGroupProps);

  const subGroupParts = createRuleGroupParts(() => subGroupProps);
</script>

<RuleComponents
  mode="subQuery"
  rule={{ props, parts }}
  subQuery={{ props: subGroupProps, parts: subGroupParts }} />
