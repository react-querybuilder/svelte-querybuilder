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
  import { untrack } from 'svelte';
  import { createQueryBuilderState } from '../reactive/createQueryBuilderState.svelte';
  import { createRuleGroupParts } from '../reactive/ruleGroupParts.svelte';
  import type { RuleParts } from '../reactive/ruleParts.svelte';
  import type { QueryBuilderProps, RuleGroupProps, RuleProps } from '../types/props';
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

  // Used only until the rule's value becomes a valid group, which happens on the first commit.
  const initialQuery = untrack(() => schema.createRuleGroup()) as RuleGroupType;

  const subQueryProps = $derived({
    ...subQueryBuilderProps,
    disabled: parts.disabled,
    fields: subproperties,
    // Write the value back on first render when it is not already a valid rule group.
    enableMountQueryChange: !isRuleGroup(props.rule.value) || !props.rule.value.id,
    query: isRuleGroup(props.rule.value) ? (props.rule.value as RuleGroupType) : initialQuery,
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

<RuleComponents {props} {parts} subQueryProps={subGroupProps} subQueryParts={subGroupParts} />
