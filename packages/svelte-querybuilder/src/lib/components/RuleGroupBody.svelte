<!--
  @component
  The rules, groups, and inline combinators in a rule group's body, without the wrapping
  `<div>`.

  Port of React Query Builder's `RuleGroupBodyComponents`. See `RuleGroupHeader.svelte` for why
  this is internal rather than a control element.
-->
<script lang="ts">
  import { isRuleGroup } from '@react-querybuilder/core';
  import Control from '../internal/Control.svelte';
  import type { RuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleGroupProps } from '../types/props.js';

  const { props, parts }: { props: RuleGroupProps; parts: RuleGroupParts } = $props();

  const schema = $derived(props.schema);
  const translations = $derived(props.translations);
  const path = $derived(props.path);
  const classNames = $derived(parts.classNames);
  const ruleGroup = $derived(parts.ruleGroup);

  const controls = $derived(schema.controls);

  /** Props shared by both inline-combinator renderings. */
  const inlineCommon = $derived({
    options: schema.combinators,
    title: translations.combinators.title,
    className: classNames.combinators,
    rules: ruleGroup.rules,
    level: path.length,
    context: props.context,
    validation: parts.validationResult,
    component: controls.combinatorSelector,
    schema,
    ruleGroup,
  });
</script>

{#each ruleGroup.rules as r, idx (typeof r === 'string' ? [...parts.pathsMemo[idx].path, r].join('-') : r.id)}
  {@const thisPath = parts.pathsMemo[idx].path}
  {@const thisPathDisabled =
    parts.pathsMemo[idx].disabled || (typeof r !== 'string' && !!r.disabled)}
  {@const shiftUpDisabled = path.length === 0 && idx === 0}
  {@const shiftDownDisabled = path.length === 0 && idx === ruleGroup.rules.length - 1}
  {#if idx > 0 && !schema.independentCombinators && schema.showCombinatorsBetweenRules}
    <Control
      control={controls.inlineCombinator}
      props={{
        ...inlineCommon,
        value: parts.combinator,
        handleOnChange: parts.onCombinatorChange,
        path: thisPath,
        disabled: parts.disabled,
      }} />
  {/if}
  {#if typeof r === 'string'}
    <Control
      control={controls.inlineCombinator}
      props={{
        ...inlineCommon,
        value: r,
        handleOnChange: (val: string) => parts.onIndependentCombinatorChange(val, idx),
        path: thisPath,
        disabled: thisPathDisabled,
      }} />
  {:else if isRuleGroup(r)}
    <Control
      control={controls.ruleGroup}
      props={{
        id: r.id,
        schema,
        actions: props.actions,
        path: thisPath,
        translations,
        ruleGroup: r,
        disabled: thisPathDisabled,
        parentDisabled: props.parentDisabled || parts.disabled,
        parentMuted: props.parentMuted || parts.muted,
        shiftUpDisabled,
        shiftDownDisabled,
        context: props.context,
      }} />
  {:else}
    <Control
      control={controls.rule}
      props={{
        id: r.id,
        rule: r,
        schema,
        actions: props.actions,
        path: thisPath,
        disabled: thisPathDisabled,
        parentDisabled: props.parentDisabled || parts.disabled,
        parentMuted: props.parentMuted || parts.muted,
        translations,
        shiftUpDisabled,
        shiftDownDisabled,
        context: props.context,
      }} />
  {/if}
{/each}
