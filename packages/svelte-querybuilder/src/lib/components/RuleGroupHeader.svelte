<script lang="ts">
  import { TestID } from '@react-querybuilder/core';
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

  // Prop bags are getter-backed objects built ONCE, not `$derived` object literals. See
  // `withCommonProps`.
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
      return props.context;
    },
    get validation() {
      return parts.validationResult;
    },
    get schema() {
      return schema;
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
    get shiftUp() {
      return parts.shiftGroupUp;
    },
    get shiftDown() {
      return parts.shiftGroupDown;
    },
    get shiftUpDisabled() {
      return props.shiftUpDisabled;
    },
    get shiftDownDisabled() {
      return props.shiftDownDisabled;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });

  const combinatorSelectorProps = withCommonProps(common, {
    testID: TestID.combinators,
    get options() {
      return schema.combinators;
    },
    get value() {
      return parts.combinator;
    },
    get title() {
      return translations.combinators.title;
    },
    get className() {
      return classNames.combinators;
    },
    get handleOnChange() {
      return parts.onCombinatorChange;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get ruleGroup() {
      return ruleGroup;
    },
  });

  const notToggleProps = withCommonProps(common, {
    testID: TestID.notToggle,
    get className() {
      return classNames.notToggle;
    },
    get title() {
      return translations.notToggle.title;
    },
    get label() {
      return translations.notToggle.label;
    },
    get checked() {
      return ruleGroup.not;
    },
    get handleOnChange() {
      return parts.onNotToggleChange;
    },
    get ruleGroup() {
      return ruleGroup;
    },
  });

  const addRuleActionProps = withCommonProps(common, {
    testID: TestID.addRule,
    get label() {
      return translations.addRule.label;
    },
    get title() {
      return translations.addRule.title;
    },
    get className() {
      return classNames.addRule;
    },
    get handleOnClick() {
      return parts.addRule;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });

  const addGroupActionProps = withCommonProps(common, {
    testID: TestID.addGroup,
    get label() {
      return translations.addGroup.label;
    },
    get title() {
      return translations.addGroup.title;
    },
    get className() {
      return classNames.addGroup;
    },
    get handleOnClick() {
      return parts.addGroup;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });

  const cloneGroupActionProps = withCommonProps(common, {
    testID: TestID.cloneGroup,
    get label() {
      return translations.cloneRuleGroup.label;
    },
    get title() {
      return translations.cloneRuleGroup.title;
    },
    get className() {
      return classNames.cloneGroup;
    },
    get handleOnClick() {
      return parts.cloneGroup;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });

  const lockGroupActionProps = withCommonProps(common, {
    testID: TestID.lockGroup,
    get label() {
      return translations.lockGroup.label;
    },
    get title() {
      return translations.lockGroup.title;
    },
    get className() {
      return classNames.lockGroup;
    },
    get handleOnClick() {
      return parts.toggleLockGroup;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get disabledTranslation() {
      return props.parentDisabled ? undefined : translations.lockGroupDisabled;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });

  const muteGroupActionProps = withCommonProps(common, {
    testID: TestID.muteGroup,
    get label() {
      return ruleGroup.muted ? translations.unmuteGroup.label : translations.muteGroup.label;
    },
    get title() {
      return ruleGroup.muted ? translations.unmuteGroup.title : translations.muteGroup.title;
    },
    get className() {
      return classNames.muteGroup;
    },
    get handleOnClick() {
      return parts.toggleMuteGroup;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });

  const undoRedoActionsProps = withCommonProps(common, {
    testID: TestID.undoRedoActions,
    get titles() {
      return schema.showUndoRedo
        ? { undo: translations.undo.title, redo: translations.redo.title }
        : undefined;
    },
    get labels() {
      return schema.showUndoRedo
        ? { undo: translations.undo.label, redo: translations.redo.label }
        : undefined;
    },
    get className() {
      return classNames.undoRedoActions;
    },
    get classNames() {
      return schema.showUndoRedo
        ? { undo: classNames.undoAction, redo: classNames.redoAction }
        : undefined;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });

  const removeGroupActionProps = withCommonProps(common, {
    testID: TestID.removeGroup,
    get label() {
      return translations.removeGroup.label;
    },
    get title() {
      return translations.removeGroup.title;
    },
    get className() {
      return classNames.removeGroup;
    },
    get handleOnClick() {
      return parts.removeGroup;
    },
    get rules() {
      return ruleGroup.rules;
    },
    get ruleOrGroup() {
      return ruleGroup;
    },
  });
</script>

<!--
  @component
  The controls in a rule group's header, without the wrapping `<div>`.

  Port of React Query Builder's `RuleGroupHeaderComponents`. Internal rather than a control
  element; it is a separate component only so that `Rule` can reuse it for a subquery.

  The `<!-- -->`
joiners between siblings suppress the whitespace text nodes Svelte would otherwise emit between them
— see `RuleComponents.svelte` for why that matters. -->

{#if schema.showShiftActions && path.length > 0}
  <Control control={controls.shiftActions} props={shiftActionsProps} />
{/if}<!--
-->{#if !schema.showCombinatorsBetweenRules && !schema.independentCombinators}
  <Control control={controls.combinatorSelector} props={combinatorSelectorProps} />
{/if}<!--
-->{#if schema.showNotToggle}
  <Control control={controls.notToggle} props={notToggleProps} />
{/if}<!--
--><Control
  control={controls.addRuleAction}
  props={addRuleActionProps} /><!--
-->{#if schema.maxLevels > path.length}
  <Control control={controls.addGroupAction} props={addGroupActionProps} />
{/if}<!--
-->{#if schema.showCloneButtons && path.length > 0}
  <Control control={controls.cloneGroupAction} props={cloneGroupActionProps} />
{/if}<!--
-->{#if schema.showLockButtons}
  <Control control={controls.lockGroupAction} props={lockGroupActionProps} />
{/if}<!--
-->{#if schema.showMuteButtons}
  <Control control={controls.muteGroupAction} props={muteGroupActionProps} />
{/if}<!--
-->{#if schema.showUndoRedo && path.length === 0}
  <Control control={controls.undoRedoActions} props={undoRedoActionsProps} />
{/if}<!--
-->{#if path.length > 0}
  <Control control={controls.removeGroupAction} props={removeGroupActionProps} />
{/if}
