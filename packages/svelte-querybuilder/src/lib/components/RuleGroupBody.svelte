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
  import { withCommonProps } from '../internal/lazyProps.js';
  import type { RuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleGroupProps } from '../types/props.js';

  const { props, parts }: { props: RuleGroupProps; parts: RuleGroupParts } = $props();

  const schema = $derived(props.schema);
  const translations = $derived(props.translations);
  const path = $derived(props.path);
  const classNames = $derived(parts.classNames);
  const ruleGroup = $derived(parts.ruleGroup);

  const controls = $derived(schema.controls);

  /**
   * Props shared by both inline-combinator renderings. Getter-backed rather than a `$derived`
   * object literal — see `withCommonProps`. This matters most here: an eager literal inside the
   * `{#each}` below makes every child of every rule re-dirty whenever any one of these changes.
   */
  const inlineCommon = {
    get options() {
      return schema.combinators;
    },
    get title() {
      return translations.combinators.title;
    },
    get className() {
      return classNames.combinators;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get level() {
      return path.length;
    },
    get context() {
      return props.context;
    },
    get validation() {
      return parts.validationResult;
    },
    get component() {
      return controls.combinatorSelector;
    },
    get schema() {
      return schema;
    },
    get ruleGroup() {
      return ruleGroup;
    },
  };
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
      props={withCommonProps(inlineCommon, {
        get value() {
          return parts.combinator;
        },
        get handleOnChange() {
          return parts.onCombinatorChange;
        },
        get path() {
          return thisPath;
        },
        get disabled() {
          return parts.disabled;
        },
      })} />
  {/if}<!--
  -->{#if typeof r === 'string'}
    <Control
      control={controls.inlineCombinator}
      props={withCommonProps(inlineCommon, {
        get value() {
          return r;
        },
        handleOnChange: (val: string) => parts.onIndependentCombinatorChange(val, idx),
        get path() {
          return thisPath;
        },
        get disabled() {
          return thisPathDisabled;
        },
      })} />
  {:else if isRuleGroup(r)}
    <Control
      control={controls.ruleGroup}
      props={{
        get id() {
          return r.id;
        },
        get schema() {
          return schema;
        },
        get actions() {
          return props.actions;
        },
        get path() {
          return thisPath;
        },
        get translations() {
          return translations;
        },
        get ruleGroup() {
          return r;
        },
        get disabled() {
          return thisPathDisabled;
        },
        get parentDisabled() {
          return props.parentDisabled || parts.disabled;
        },
        get parentMuted() {
          return props.parentMuted || parts.muted;
        },
        get shiftUpDisabled() {
          return shiftUpDisabled;
        },
        get shiftDownDisabled() {
          return shiftDownDisabled;
        },
        get context() {
          return props.context;
        },
      }} />
  {:else}
    <Control
      control={controls.rule}
      props={{
        get id() {
          return r.id;
        },
        get rule() {
          return r;
        },
        get schema() {
          return schema;
        },
        get actions() {
          return props.actions;
        },
        get path() {
          return thisPath;
        },
        get disabled() {
          return thisPathDisabled;
        },
        get parentDisabled() {
          return props.parentDisabled || parts.disabled;
        },
        get parentMuted() {
          return props.parentMuted || parts.muted;
        },
        get translations() {
          return translations;
        },
        get shiftUpDisabled() {
          return shiftUpDisabled;
        },
        get shiftDownDisabled() {
          return shiftDownDisabled;
        },
        get context() {
          return props.context;
        },
      }} />
  {/if}
{/each}
