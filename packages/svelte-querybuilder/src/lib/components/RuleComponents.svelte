<!--
  @component
  The controls that make up a rule, without the wrapping `<div>`.

  Port of React Query Builder's `RuleComponents`. In `subQuery` mode (used by
  `RuleSubQuery.svelte`) the subquery's group header and body are rendered in `<div>`s around
  the rule's own action buttons, which is why one instance has to hold two `(props, parts)`
  pairs from two separate query-builder states.
-->
<script lang="ts">
  import { TestID } from '@react-querybuilder/core';
  import Control from '../internal/Control.svelte';
  import { withCommonProps } from '../internal/lazyProps.js';
  import type { RuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleParts } from '../reactive/ruleParts.svelte.js';
  import type { RuleGroupProps, RuleProps } from '../types/props.js';
  import RuleGroupBody from './RuleGroupBody.svelte';
  import RuleGroupHeader from './RuleGroupHeader.svelte';

  /**
   * `mode` is the discriminator, not the presence of `subQuery`: in `subQuery` mode the rule
   * renders a `matchModeEditor` instead of the operator/value controls, and that choice is a
   * statement about the rule, not a side effect of having been handed a second state.
   */
  type Props =
    | { mode: 'rule'; rule: { props: RuleProps; parts: RuleParts }; subQuery?: never }
    | {
        mode: 'subQuery';
        rule: { props: RuleProps; parts: RuleParts };
        subQuery: { props: RuleGroupProps; parts: RuleGroupParts };
      };

  const { mode, rule, subQuery }: Props = $props();

  const ruleProps = $derived(rule.props);
  const parts = $derived(rule.parts);

  const schema = $derived(ruleProps.schema);
  /** The `RuleType` itself, as distinct from the `rule` prop, which is its props/parts pair. */
  const ruleObj = $derived(ruleProps.rule);
  const translations = $derived(ruleProps.translations);
  const path = $derived(ruleProps.path);
  const classNames = $derived(parts.classNames);
  const ctx = $derived(parts.ctx);

  // Every control's prop bag is a getter-backed object built ONCE, not a `$derived` object
  // literal. `Control` forwards it through `{...props}`, and Svelte's `spread_props` proxy reads
  // one key at a time, so a getter keeps each of the child's props subscribed to just its own
  // sources. An eager literal instead subscribes every prop of every control to the union of all
  // of them, which is O(controls x keys) reaction-graph edges per rule — see CHANGELOG.
  const common = {
    get level() {
      return path.length;
    },
    get path() {
      return path;
    },
    get disabled() {
      return parts.disabled;
    },
    get context() {
      return ruleProps.context;
    },
    get validation() {
      return ctx.validationResult;
    },
    get schema() {
      return schema;
    },
    get rule() {
      return ruleObj;
    },
  };

  const controls = $derived(schema.controls);

  const shiftActionsProps = withCommonProps(common, {
    testID: TestID.shiftActions,
    get titles() {
      return schema.showShiftActions
        ? {
            shiftUp: translations.shiftActionUp.title,
            shiftDown: translations.shiftActionDown.title,
          }
        : undefined;
    },
    get labels() {
      return schema.showShiftActions
        ? {
            shiftUp: translations.shiftActionUp.label,
            shiftDown: translations.shiftActionDown.label,
          }
        : undefined;
    },
    get className() {
      return classNames.shiftActions;
    },
    get ruleOrGroup() {
      return ruleObj;
    },
    get shiftUp() {
      return parts.shiftRuleUp;
    },
    get shiftDown() {
      return parts.shiftRuleDown;
    },
    get shiftUpDisabled() {
      return ruleProps.shiftUpDisabled;
    },
    get shiftDownDisabled() {
      return ruleProps.shiftDownDisabled;
    },
  });

  const fieldSelectorProps = withCommonProps(common, {
    testID: TestID.fields,
    get options() {
      return schema.fields;
    },
    get title() {
      return translations.fields.title;
    },
    get value() {
      return ruleObj.field;
    },
    get operator() {
      return ruleObj.operator;
    },
    get className() {
      return classNames.fields;
    },
    get handleOnChange() {
      return parts.onChangeField;
    },
  });

  const matchModeEditorProps = withCommonProps(common, {
    testID: TestID.matchModeEditor,
    get field() {
      return ruleObj.field;
    },
    get fieldData() {
      return parts.fieldData;
    },
    get title() {
      return translations.matchMode.title;
    },
    get options() {
      return ctx.matchModes;
    },
    get thresholdPlaceholder() {
      return translations.matchThreshold.placeholderName;
    },
    get match() {
      return ruleObj.match ?? { mode: 'all' };
    },
    get className() {
      return classNames.matchMode;
    },
    get classNames() {
      return classNames;
    },
    get handleOnChange() {
      return parts.onChangeMatchMode;
    },
  });

  const operatorSelectorProps = withCommonProps(common, {
    testID: TestID.operators,
    get field() {
      return ruleObj.field;
    },
    get fieldData() {
      return parts.fieldData;
    },
    get title() {
      return translations.operators.title;
    },
    get options() {
      return ctx.operators;
    },
    get value() {
      return ruleObj.operator;
    },
    get className() {
      return classNames.operators;
    },
    get handleOnChange() {
      return parts.onChangeOperator;
    },
  });

  const valueSourceSelectorProps = withCommonProps(common, {
    testID: TestID.valueSourceSelector,
    get field() {
      return ruleObj.field;
    },
    get fieldData() {
      return parts.fieldData;
    },
    get title() {
      return translations.valueSourceSelector.title;
    },
    get options() {
      return ctx.valueSourceOptions;
    },
    get value() {
      return ruleObj.valueSource ?? 'value';
    },
    get className() {
      return classNames.valueSource;
    },
    get handleOnChange() {
      return parts.onChangeValueSource;
    },
  });

  const valueEditorProps = withCommonProps(common, {
    testID: TestID.valueEditor,
    get field() {
      return ruleObj.field;
    },
    get fieldData() {
      return parts.fieldData;
    },
    get title() {
      return translations.value.title;
    },
    get operator() {
      return ruleObj.operator;
    },
    get value() {
      return ruleObj.value;
    },
    get valueSource() {
      return ruleObj.valueSource ?? 'value';
    },
    get type() {
      return ctx.valueEditorType;
    },
    get inputType() {
      return ctx.inputType;
    },
    get values() {
      return ctx.values;
    },
    get listsAsArrays() {
      return schema.listsAsArrays;
    },
    get parseNumbers() {
      return schema.parseNumbers;
    },
    get separator() {
      return parts.valueEditorSeparator;
    },
    get className() {
      return classNames.value;
    },
    get handleOnChange() {
      return parts.onChangeValue;
    },
  });

  const cloneRuleActionProps = withCommonProps(common, {
    testID: TestID.cloneRule,
    get label() {
      return translations.cloneRule.label;
    },
    get title() {
      return translations.cloneRule.title;
    },
    get className() {
      return classNames.cloneRule;
    },
    get ruleOrGroup() {
      return ruleObj;
    },
    get handleOnClick() {
      return parts.cloneRule;
    },
  });

  const lockRuleActionProps = withCommonProps(common, {
    testID: TestID.lockRule,
    get label() {
      return translations.lockRule.label;
    },
    get title() {
      return translations.lockRule.title;
    },
    get className() {
      return classNames.lockRule;
    },
    get ruleOrGroup() {
      return ruleObj;
    },
    get handleOnClick() {
      return parts.toggleLockRule;
    },
    get disabledTranslation() {
      return ruleProps.parentDisabled ? undefined : translations.lockRuleDisabled;
    },
  });

  const muteRuleActionProps = withCommonProps(common, {
    testID: TestID.muteRule,
    get label() {
      return ruleObj.muted ? translations.unmuteRule.label : translations.muteRule.label;
    },
    get title() {
      return ruleObj.muted ? translations.unmuteRule.title : translations.muteRule.title;
    },
    get className() {
      return classNames.muteRule;
    },
    get ruleOrGroup() {
      return ruleObj;
    },
    get handleOnClick() {
      return parts.toggleMuteRule;
    },
  });

  const removeRuleActionProps = withCommonProps(common, {
    testID: TestID.removeRule,
    get label() {
      return translations.removeRule.label;
    },
    get title() {
      return translations.removeRule.title;
    },
    get className() {
      return classNames.removeRule;
    },
    get ruleOrGroup() {
      return ruleObj;
    },
    get handleOnClick() {
      return parts.removeRule;
    },
  });
</script>

{#if schema.showShiftActions}
  <Control control={controls.shiftActions} props={shiftActionsProps} />
{/if}
{#if parts.showFieldSelector}
  <Control control={controls.fieldSelector} props={fieldSelectorProps} />
{/if}
{#if schema.autoSelectField || ruleObj.field !== translations.fields.placeholderName}
  {#if mode === 'subQuery'}
    <Control control={controls.matchModeEditor} props={matchModeEditorProps} />
  {:else}
    <Control control={controls.operatorSelector} props={operatorSelectorProps} />
    {#if parts.showValueControls}
      {#if parts.showValueSourceSelector}
        <Control control={controls.valueSourceSelector} props={valueSourceSelectorProps} />
      {/if}
      <Control control={controls.valueEditor} props={valueEditorProps} />
    {/if}
  {/if}
{/if}
{#if subQuery}
  <div class={subQuery.parts.classNames.header}>
    <RuleGroupHeader props={subQuery.props} parts={subQuery.parts} />
  </div>
{/if}
{#if schema.showCloneButtons}
  <Control control={controls.cloneRuleAction} props={cloneRuleActionProps} />
{/if}
{#if schema.showLockButtons}
  <Control control={controls.lockRuleAction} props={lockRuleActionProps} />
{/if}
{#if schema.showMuteButtons}
  <Control control={controls.muteRuleAction} props={muteRuleActionProps} />
{/if}
<Control control={controls.removeRuleAction} props={removeRuleActionProps} />
{#if subQuery}
  <div class={subQuery.parts.classNames.body}>
    <RuleGroupBody props={subQuery.props} parts={subQuery.parts} />
  </div>
{/if}
