import type { RuleGroupTypeAny } from '@react-querybuilder/core';
import {
  derivePathInfo,
  deriveRuleGroupClassNames,
  deriveRuleGroupContext,
  deriveRuleGroupOuterClassName,
  getParentPath,
  getValidationClassNames,
} from '@react-querybuilder/core';
import type { RuleGroupProps } from '../types/props.js';

// oxlint-disable-next-line typescript/no-explicit-any
type AnyContext = any;

/** A click handler that also receives the arbitrary `context` an action element may pass. */
type ActionHandler = (event?: MouseEvent, context?: AnyContext) => void;

/**
 * Everything `RuleGroup`, `RuleGroupHeader`, and `RuleGroupBody` need, derived from
 * {@link RuleGroupProps}.
 *
 * The class names and the resolved group configuration come from core; what remains is a
 * handful of derivations and the event handlers.
 */
export interface RuleGroupParts {
  /**
   * The group as rendered. A group with no `combinator` of its own resolves to the first
   * configured combinator, and the copy carries it so subcomponents see a consistent value.
   */
  readonly ruleGroup: RuleGroupTypeAny;
  readonly combinator: string;
  readonly disabled: boolean;
  readonly muted: boolean;
  readonly validationResult: ReturnType<typeof deriveRuleGroupContext>['validationResult'];
  readonly classNames: ReturnType<typeof deriveRuleGroupClassNames>;
  readonly outerClassName: string;
  readonly accessibleDescription: string;
  /** Per-child path and disabled state, in `ruleGroup.rules` order. */
  readonly pathsMemo: ReturnType<typeof derivePathInfo>;
  readonly onCombinatorChange: (value: AnyContext) => void;
  readonly onIndependentCombinatorChange: (value: AnyContext, index: number) => void;
  readonly onNotToggleChange: (checked: boolean) => void;
  readonly addRule: ActionHandler;
  readonly addGroup: ActionHandler;
  readonly cloneGroup: ActionHandler;
  readonly toggleLockGroup: ActionHandler;
  readonly toggleMuteGroup: ActionHandler;
  readonly removeGroup: ActionHandler;
  readonly shiftGroupUp: ActionHandler;
  readonly shiftGroupDown: ActionHandler;
}

/**
 * Wraps an action handler so it stops the triggering event from propagating.
 */
const stopPropagation =
  (method: ActionHandler): ActionHandler =>
  (event, context) => {
    event?.preventDefault();
    event?.stopPropagation();
    method(event, context);
  };

/**
 * Derives the rendering state for a rule group.
 *
 * Takes a getter rather than a props object so that callers outside a component's `$props()`
 * (notably `Rule`, for a subquery) can supply a synthesized, still-reactive props object.
 */
export const createRuleGroupParts = (getProps: () => RuleGroupProps): RuleGroupParts => {
  const props = $derived(getProps());
  const schema = $derived(props.schema);
  const path = $derived(props.path);

  const disabled = $derived(!!props.parentDisabled || !!props.disabled);
  const muted = $derived(!!props.parentMuted || !!props.ruleGroup.muted);

  const ctx = $derived(
    deriveRuleGroupContext(props.ruleGroup, schema.combinators, {
      validationMap: schema.validationMap,
      id: props.id,
    })
  );

  const ruleGroup = $derived.by((): RuleGroupTypeAny => {
    if (schema.independentCombinators || props.ruleGroup.combinator === ctx.combinator) {
      return props.ruleGroup;
    }
    return { ...props.ruleGroup, combinator: ctx.combinator } as RuleGroupTypeAny;
  });

  const classNames = $derived(
    deriveRuleGroupClassNames({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
    })
  );

  const validationClassName = $derived(getValidationClassNames(ctx.validationResult));

  const outerClassName = $derived(
    deriveRuleGroupOuterClassName({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
      leadingClassNames: [schema.getRuleGroupClassname(ruleGroup), ctx.combinatorBasedClassName],
      disabled,
      muted,
      validationClassName,
    })
  );

  const pathsMemo = $derived(
    derivePathInfo(path, ruleGroup.rules.length, {
      disabled,
      disabledPaths: schema.disabledPaths,
    })
  );

  const accessibleDescription = $derived(
    // No `qbId` in this package; the default generator ignores it.
    schema.accessibleDescriptionGenerator({ path, qbId: '' })
  );

  const onCombinatorChange = (value: AnyContext) => {
    if (!disabled) props.actions.onPropChange('combinator', value, path);
  };

  const onIndependentCombinatorChange = (value: AnyContext, index: number) => {
    if (!disabled) props.actions.onPropChange('combinator', value, [...path, index]);
  };

  const onNotToggleChange = (checked: boolean) => {
    if (!disabled) props.actions.onPropChange('not', checked, path);
  };

  const addRule = stopPropagation((_event, context) => {
    if (!disabled) props.actions.onRuleAdd(schema.createRule(), path, context);
  });

  const addGroup = stopPropagation((_event, context) => {
    if (!disabled) props.actions.onGroupAdd(schema.createRuleGroup(), path, context);
  });

  const cloneGroup = stopPropagation(() => {
    if (!disabled) {
      props.actions.moveRule(path, [...getParentPath(path), path.at(-1)! + 1], true);
    }
  });

  const toggleLockGroup = stopPropagation(() => {
    props.actions.onPropChange('disabled', !disabled, path);
  });

  const toggleMuteGroup = stopPropagation(() => {
    props.actions.onPropChange('muted', !ruleGroup.muted, path);
  });

  const removeGroup = stopPropagation(() => {
    if (!disabled) props.actions.onGroupRemove(path);
  });

  const shiftGroupUp = stopPropagation(event => {
    if (!disabled && !props.shiftUpDisabled) props.actions.moveRule(path, 'up', event?.altKey);
  });

  const shiftGroupDown = stopPropagation(event => {
    if (!disabled && !props.shiftDownDisabled) props.actions.moveRule(path, 'down', event?.altKey);
  });

  return {
    get ruleGroup() {
      return ruleGroup;
    },
    get combinator() {
      return ctx.combinator;
    },
    get disabled() {
      return disabled;
    },
    get muted() {
      return muted;
    },
    get validationResult() {
      return ctx.validationResult;
    },
    get classNames() {
      return classNames;
    },
    get outerClassName() {
      return outerClassName;
    },
    get accessibleDescription() {
      return accessibleDescription;
    },
    get pathsMemo() {
      return pathsMemo;
    },
    onCombinatorChange,
    onIndependentCombinatorChange,
    onNotToggleChange,
    addRule,
    addGroup,
    cloneGroup,
    toggleLockGroup,
    toggleMuteGroup,
    removeGroup,
    shiftGroupUp,
    shiftGroupDown,
  };
};
