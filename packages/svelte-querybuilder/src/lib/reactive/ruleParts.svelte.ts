import type { FullField, RuleContextResolvers } from '@react-querybuilder/core';
import {
  deriveRuleClassNames,
  deriveRuleContext,
  deriveRuleOuterClassName,
  getParentPath,
  getValidationClassNames,
  isPojo,
  lc,
} from '@react-querybuilder/core';
import type { RuleProps } from '../types/props';
import type { LabelNode } from '../types/translations';

// oxlint-disable-next-line typescript/no-explicit-any
type AnyContext = any;

/** A click handler that also receives the arbitrary `context` an action element may pass. */
type ActionHandler = (event?: MouseEvent, context?: AnyContext) => void;

/**
 * Everything `Rule` and `RuleComponents` need, derived from {@link RuleProps}.
 *
 * Class names come from core's `deriveRule*ClassNames`, and the resolved rule configuration
 * from core's `deriveRuleContext`.
 */
export interface RuleParts {
  readonly ctx: ReturnType<typeof deriveRuleContext<FullField>>;
  readonly disabled: boolean;
  readonly muted: boolean;
  readonly classNames: ReturnType<typeof deriveRuleClassNames>;
  readonly outerClassName: string;
  readonly fieldData: FullField;
  readonly valueEditorSeparator: LabelNode;
  /** Whether this rule's field supports match modes, i.e. whether it renders a subquery. */
  readonly hasSubQuery: boolean;
  readonly showFieldSelector: boolean;
  readonly showValueControls: boolean;
  readonly showValueSourceSelector: boolean;
  readonly onChangeField: (value: AnyContext, context?: AnyContext) => void;
  readonly onChangeOperator: (value: AnyContext, context?: AnyContext) => void;
  readonly onChangeMatchMode: (value: AnyContext, context?: AnyContext) => void;
  readonly onChangeValueSource: (value: AnyContext, context?: AnyContext) => void;
  readonly onChangeValue: (value: AnyContext, context?: AnyContext) => void;
  readonly cloneRule: ActionHandler;
  readonly toggleLockRule: ActionHandler;
  readonly toggleMuteRule: ActionHandler;
  readonly removeRule: ActionHandler;
  readonly shiftRuleUp: ActionHandler;
  readonly shiftRuleDown: ActionHandler;
}

/** Wraps an action handler so it stops the triggering event from propagating. */
const stopPropagation =
  (method: ActionHandler): ActionHandler =>
  (event, context) => {
    event?.preventDefault();
    event?.stopPropagation();
    method(event, context);
  };

/**
 * Derives the rendering state for a rule.
 *
 * Takes a getter rather than a props object so that callers outside a component's `$props()`
 * can supply a synthesized, still-reactive props object.
 */
export const createRuleParts = (getProps: () => RuleProps): RuleParts => {
  const props = $derived(getProps());
  const schema = $derived(props.schema);
  const rule = $derived(props.rule);
  const translations = $derived(props.translations);
  const path = $derived(props.path);

  const disabled = $derived(!!props.parentDisabled || !!props.disabled);
  const muted = $derived(!!props.parentMuted || !!rule.muted);

  const classNames = $derived(
    deriveRuleClassNames({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
    })
  );

  // Resolved from `schema` rather than `schema.manager.getRuleContext(path)` so that a
  // replacement `rule` component—or a subquery, whose rules are not in the manager's query at
  // all—can still be rendered.
  const resolvers = $derived({
    fields: schema.fields,
    fieldMap: schema.fieldMap,
    getInputType: schema.getInputType,
    getMatchModes: schema.getMatchModes,
    getOperators: schema.getOperators,
    getParameters: schema.getParameters,
    getValueEditorType: schema.getValueEditorType,
    getValues: schema.getValues,
    getValueSources: schema.getValueSources,
    getSubQueryBuilderProps: schema.getSubQueryBuilderProps,
  } as unknown as RuleContextResolvers<FullField>);

  const ctx = $derived(
    deriveRuleContext(rule, resolvers, { validationMap: schema.validationMap, id: props.id })
  );

  const fieldData = $derived(ctx.fieldData);
  const valueEditorSeparator = $derived(
    schema.getValueEditorSeparator(rule.field, rule.operator, { fieldData })
  );

  const hasSubQuery = $derived(ctx.matchModes.length > 0);

  const validationClassName = $derived(getValidationClassNames(ctx.validationResult));

  const outerClassName = $derived(
    deriveRuleOuterClassName({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
      leadingClassNames: [
        schema.getRuleClassname(rule, { fieldData }),
        fieldData?.className ?? '',
        ctx.operatorObject?.className ?? '',
      ],
      disabled,
      muted,
      hasSubQuery,
      validationClassName,
    })
  );

  const changeHandler = (prop: string) => (value: AnyContext, context?: AnyContext) => {
    if (!disabled) props.actions.onPropChange(prop as never, value, path, context);
  };

  const onChangeField = $derived(changeHandler('field'));
  const onChangeOperator = $derived(changeHandler('operator'));
  const onChangeMatchMode = $derived(changeHandler('match'));
  const onChangeValueSource = $derived(changeHandler('valueSource'));
  const onChangeValue = $derived(changeHandler('value'));

  const cloneRule = stopPropagation((_event, context) => {
    if (!disabled) {
      props.actions.moveRule(path, [...getParentPath(path), path.at(-1)! + 1], true, context);
    }
  });

  const toggleLockRule = stopPropagation((_event, context) => {
    props.actions.onPropChange('disabled', !disabled, path, context);
  });

  const toggleMuteRule = stopPropagation((_event, context) => {
    props.actions.onPropChange('muted', !rule.muted, path, context);
  });

  const removeRule = stopPropagation(() => {
    if (!disabled) props.actions.onRuleRemove(path);
  });

  const shiftRuleUp = stopPropagation((event, context) => {
    if (!disabled && !props.shiftUpDisabled) {
      props.actions.moveRule(path, 'up', event?.altKey, context);
    }
  });

  const shiftRuleDown = stopPropagation((event, context) => {
    if (!disabled && !props.shiftDownDisabled) {
      props.actions.moveRule(path, 'down', event?.altKey, context);
    }
  });

  const showFieldSelector = $derived(
    !(
      schema.fields.length === 1 &&
      isPojo(schema.fields[0]) &&
      'value' in schema.fields[0] &&
      schema.fields[0].value === ''
    )
  );

  const showValueControls = $derived(
    (schema.autoSelectOperator || rule.operator !== translations.operators.placeholderName) &&
      !ctx.hideValueControls
  );

  const showValueSourceSelector = $derived(
    !['null', 'notnull'].includes(lc(`${rule.operator}`)) && ctx.valueSources.length > 1
  );

  return {
    get ctx() {
      return ctx;
    },
    get disabled() {
      return disabled;
    },
    get muted() {
      return muted;
    },
    get classNames() {
      return classNames;
    },
    get outerClassName() {
      return outerClassName;
    },
    get fieldData() {
      return fieldData;
    },
    get valueEditorSeparator() {
      return valueEditorSeparator;
    },
    get hasSubQuery() {
      return hasSubQuery;
    },
    get showFieldSelector() {
      return showFieldSelector;
    },
    get showValueControls() {
      return showValueControls;
    },
    get showValueSourceSelector() {
      return showValueSourceSelector;
    },
    get onChangeField() {
      return onChangeField;
    },
    get onChangeOperator() {
      return onChangeOperator;
    },
    get onChangeMatchMode() {
      return onChangeMatchMode;
    },
    get onChangeValueSource() {
      return onChangeValueSource;
    },
    get onChangeValue() {
      return onChangeValue;
    },
    cloneRule,
    toggleLockRule,
    toggleMuteRule,
    removeRule,
    shiftRuleUp,
    shiftRuleDown,
  };
};
