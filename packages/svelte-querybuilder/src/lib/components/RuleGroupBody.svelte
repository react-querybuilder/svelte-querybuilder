<!--
  @component
  The rules, groups, and inline combinators in a rule group's body, without the wrapping
  `<div>`.

  Port of React Query Builder's `RuleGroupBodyComponents`. See `RuleGroupHeader.svelte` for why
  this is internal rather than a control element.
-->
<script lang="ts">
  import { isRuleGroup } from '@react-querybuilder/core';
  import type { RuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleGroupProps } from '../types/props.js';

  const { props, parts }: { props: RuleGroupProps; parts: RuleGroupParts } = $props();

  const schema = $derived(props.schema);
  const translations = $derived(props.translations);
  const path = $derived(props.path);
  const classNames = $derived(parts.classNames);
  const ruleGroup = $derived(parts.ruleGroup);

  const controls = $derived(schema.controls);
  const CombinatorSelectorControlElement = $derived(controls.combinatorSelector);
  const InlineCombinatorControlElement = $derived(controls.inlineCombinator);
  const RuleGroupControlElement = $derived(controls.ruleGroup);
  const RuleControlElement = $derived(controls.rule);
</script>

{#each ruleGroup.rules as r, idx (typeof r === 'string' ? [...parts.pathsMemo[idx].path, r].join('-') : r.id)}
  {@const thisPath = parts.pathsMemo[idx].path}
  {@const thisPathDisabled =
    parts.pathsMemo[idx].disabled || (typeof r !== 'string' && !!r.disabled)}
  {@const shiftUpDisabled = path.length === 0 && idx === 0}
  {@const shiftDownDisabled = path.length === 0 && idx === ruleGroup.rules.length - 1}
  {#if idx > 0 && !schema.independentCombinators && schema.showCombinatorsBetweenRules}
    <InlineCombinatorControlElement
      options={schema.combinators}
      value={parts.combinator}
      title={translations.combinators.title}
      className={classNames.combinators}
      handleOnChange={parts.onCombinatorChange}
      rules={ruleGroup.rules}
      level={path.length}
      context={props.context}
      validation={parts.validationResult}
      component={CombinatorSelectorControlElement}
      path={thisPath}
      disabled={parts.disabled}
      {schema}
      {ruleGroup} />
  {/if}
  {#if typeof r === 'string'}
    <InlineCombinatorControlElement
      options={schema.combinators}
      value={r}
      title={translations.combinators.title}
      className={classNames.combinators}
      handleOnChange={val => parts.onIndependentCombinatorChange(val, idx)}
      rules={ruleGroup.rules}
      level={path.length}
      context={props.context}
      validation={parts.validationResult}
      component={CombinatorSelectorControlElement}
      path={thisPath}
      disabled={thisPathDisabled}
      {schema}
      {ruleGroup} />
  {:else if isRuleGroup(r)}
    <RuleGroupControlElement
      id={r.id}
      {schema}
      actions={props.actions}
      path={thisPath}
      {translations}
      ruleGroup={r}
      disabled={thisPathDisabled}
      parentDisabled={props.parentDisabled || parts.disabled}
      parentMuted={props.parentMuted || parts.muted}
      {shiftUpDisabled}
      {shiftDownDisabled}
      context={props.context} />
  {:else}
    <RuleControlElement
      id={r.id}
      rule={r}
      {schema}
      actions={props.actions}
      path={thisPath}
      disabled={thisPathDisabled}
      parentDisabled={props.parentDisabled || parts.disabled}
      parentMuted={props.parentMuted || parts.muted}
      {translations}
      {shiftUpDisabled}
      {shiftDownDisabled}
      context={props.context} />
  {/if}
{/each}
