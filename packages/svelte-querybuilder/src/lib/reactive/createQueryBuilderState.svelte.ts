import type {
  Classnames,
  FullCombinator,
  FullField,
  FullOperator,
  FullOption,
  FullOptionList,
  FullOptionRecord,
  GetOptionIdentifierType,
  InputType,
  MatchModeOptions,
  Option,
  Path,
  QueryActions,
  QueryManagerOptions,
  RuleGroupTypeAny,
  RuleType,
  ValidationMap,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import {
  QueryManager,
  deriveQueryBuilderClassNames,
  generateAccessibleDescription,
  getRuleDefaultValue,
  isRuleGroupTypeIC,
  prepareOptionList,
  resolveCandidateQuery,
  resolveDefaultOperator,
  toFlatOptionArray,
  unchangedSignature,
} from '@react-querybuilder/core';
import { untrack } from 'svelte';
import type { Controls } from '../types/controls.js';
import type { QueryBuilderContextProps, QueryBuilderProps } from '../types/props.js';
import type { Schema } from '../types/schema.js';
import type { LabelNode, TranslationsFull } from '../types/translations.js';
import type { MergedQueryBuilderConfig } from './context.svelte.js';
import { getQueryBuilderContext, mergeQueryBuilderConfig } from './context.svelte.js';
import { createActions } from './createActions.svelte.js';

const emptyValidationMap: ValidationMap = {};
const emptyDisabledPaths: Path[] = [];
const defaultGetValueEditorSeparator = (): LabelNode => '';
const defaultGetRuleOrGroupClassname = (): string => '';

/**
 * Structural equality for manager option values, used to decide whether a prop change is worth a
 * `reconfigure`. Arrays and plain objects are compared by value; everything else—functions
 * included—by identity, which is what makes a config object rebuilt on every render compare equal
 * as long as its data did not change.
 */
const valuesEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => valuesEqual(v, b[i]))
    );
  }
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  ) {
    return false;
  }
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every(k =>
      valuesEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    )
  );
};

/**
 * Applies a query to the manager.
 *
 * The manager deep-freezes whatever it is given, which throws if the query is a deeply reactive
 * `$state` proxy—a parent component holding the query in `$state` and passing it back in is the
 * common case. Svelte offers no way to test for a proxy, so this attempts the assignment and
 * falls back to a snapshot. The manager freezes before it commits, so a failed attempt leaves
 * it untouched.
 *
 * The optimistic path is the important one: it preserves reference identity, which controlled
 * mode relies on to tell its own updates apart from external ones.
 */
const setManagerQuery = (
  manager: { setQuery: (query: RuleGroupTypeAny) => unknown },
  query: RuleGroupTypeAny
): void => {
  try {
    manager.setQuery(query);
  } catch {
    manager.setQuery($state.snapshot(query) as RuleGroupTypeAny);
  }
};

/**
 * Everything a `QueryBuilder` component needs to render, derived from its props and driven by a
 * {@link QueryManager}.
 */
export interface QueryBuilderState<F extends FullField, O extends string> {
  /** The current query. Reassigned whenever the manager notifies. */
  readonly query: RuleGroupTypeAny;
  /** Alias for {@link QueryBuilderState.query}. */
  readonly rootGroup: RuleGroupTypeAny;
  readonly manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
  readonly schema: Schema<F, O>;
  readonly actions: QueryActions;
  readonly translations: TranslationsFull;
  readonly controls: Controls<F, O>;
  readonly classNames: Classnames;
  readonly wrapperClassName: string;
  readonly dndEnabledAttr: string;
  readonly inlineCombinatorsAttr: string;
  readonly rootGroupDisabled: boolean;
  readonly queryDisabled: boolean;
  readonly independentCombinators: boolean;
  /** The config to pass down through {@link setQueryBuilderContext}. */
  readonly context: QueryBuilderContextProps<F, O>;
}

/**
 * Options for {@link createQueryBuilderState} that cannot be expressed as
 * {@link QueryBuilderProps}.
 */
export interface CreateQueryBuilderStateOptions<F extends FullField, O extends string> {
  /**
   * Default components for every control, applied last in the `controlElements` merge. Provided
   * by the component layer so that this module stays free of component imports.
   */
  defaultControls?: Partial<Controls<F, O>>;
  /**
   * Inherited context. Defaults to {@link getQueryBuilderContext}, which is only available
   * during component initialization.
   */
  context?: QueryBuilderContextProps<F, O>;
  /**
   * Called with each committed query, after `onQueryChange`. `QueryBuilder.svelte` uses it to
   * write back to the `$bindable` `query` prop, which can only be assigned from a component.
   */
  writeBack?: (query: RuleGroupTypeAny) => void;
}

/**
 * Builds the reactive state for a query builder.
 *
 * Must be called during component initialization: it installs `$effect`s for the manager
 * subscription and for controlled-mode synchronization.
 *
 * The query lives in a {@link QueryManager}. Pass an externally created manager as the
 * `manager` prop to drive the query from outside the component tree.
 *
 * Structural manager options (`fields`, `operators`, `combinators`, and the boolean flags) are
 * applied in place with `QueryManager#reconfigure` whenever the corresponding props change, so
 * the query, the undo/redo history, and every subscriber survive. Function props
 * (`getOperators`, `getDefaultValue`, etc.) are forwarded through closures, so those stay live
 * without any reconfiguration at all. An externally supplied `manager` prop is never
 * reconfigured.
 */
export const createQueryBuilderState = <
  F extends FullField = FullField,
  O extends FullOperator = FullOperator,
>(
  getProps: () => QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>,
  options: CreateQueryBuilderStateOptions<F, GetOptionIdentifierType<O>> = {}
): QueryBuilderState<F, GetOptionIdentifierType<O>> => {
  type OName = GetOptionIdentifierType<O>;
  type FName = GetOptionIdentifierType<F>;

  const inheritedContext = options.context ?? getQueryBuilderContext<F, OName>();

  const config = $derived(
    mergeQueryBuilderConfig<F, OName>({
      props: getProps(),
      context: inheritedContext,
      defaultControls: options.defaultControls,
    }) satisfies MergedQueryBuilderConfig<F, OName>
  );

  // #region Manager
  const initialProps = getProps();

  const maxLevels = $derived(
    (getProps().maxLevels ?? 0) > 0 ? Number(getProps().maxLevels) : Infinity
  );
  const disabledPaths = $derived(
    Array.isArray(getProps().disabled) ? (getProps().disabled as Path[]) : emptyDisabledPaths
  );

  /**
   * Forwards a function prop to the manager through a closure, so later changes to the prop take
   * effect without rebuilding the manager. Returns `undefined` when the prop is absent at
   * initialization, leaving the manager to apply its own precedence rules instead of treating the
   * option as configured.
   */
  const live = <A extends unknown[], R>(
    pick: (props: QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>) => unknown
  ): ((...args: A) => R) | undefined =>
    typeof pick(initialProps) === 'function'
      ? (...args: A) => (pick(getProps()) as (...args: A) => R)(...args)
      : undefined;

  /**
   * Builds the full option set for the manager. Used both for construction and for every
   * `reconfigure` call, so the two cannot drift.
   */
  const buildManagerOptions = (): QueryManagerOptions<F, O, FullCombinator> => {
    const props = getProps();
    return {
      fields: props.fields,
      operators: props.operators,
      combinators: props.combinators,
      baseField: props.baseField,
      baseOperator: props.baseOperator,
      baseCombinator: props.baseCombinator,
      autoSelectField: config.autoSelectField,
      autoSelectOperator: config.autoSelectOperator,
      autoSelectValue: config.autoSelectValue,
      // The manager prepares every option list, including the placeholder options, so it needs
      // the merged translations. Everything rendered here reads those lists back off the manager.
      translations: config.translations,
      addRuleToNewGroups: config.addRuleToNewGroups,
      listsAsArrays: config.listsAsArrays,
      resetOnFieldChange: config.resetOnFieldChange,
      resetOnOperatorChange: config.resetOnOperatorChange,
      maxLevels,
      disabledPaths,
      queryDisabled: props.disabled === true,
      history: true,
      validator: props.validator,
      idGenerator: props.idGenerator,
      // Forwarded so that changes to these props take effect without a reconfigure.
      getDefaultField: (typeof initialProps.getDefaultField === 'function'
        ? live(p => p.getDefaultField)
        : props.getDefaultField) as never,
      getDefaultOperator: (typeof initialProps.getDefaultOperator === 'function'
        ? live(p => p.getDefaultOperator)
        : props.getDefaultOperator) as never,
      getDefaultValue: live(p => p.getDefaultValue) as never,
      getOperators: live(p => p.getOperators) as never,
      getValueEditorType: live(p => p.getValueEditorType) as never,
      getValues: live(p => p.getValues) as never,
      getValueSources: live(p => p.getValueSources) as never,
      getMatchModes: live(p => p.getMatchModes) as never,
      getParameters: live(p => p.getParameters) as never,
      getInputType: live(p => p.getInputType) as never,
      getSubQueryBuilderProps: live(p => p.getSubQueryBuilderProps) as never,
    };
  };

  /**
   * The subset of the manager's options that cannot be forwarded through a closure, and so has to
   * be re-applied with `reconfigure` when it changes. Doubles as the effect's dependency set.
   */
  const structuralOptions = () => {
    const props = getProps();
    return {
      fields: props.fields,
      operators: props.operators,
      combinators: props.combinators,
      baseField: props.baseField,
      baseOperator: props.baseOperator,
      baseCombinator: props.baseCombinator,
      autoSelectField: config.autoSelectField,
      autoSelectOperator: config.autoSelectOperator,
      autoSelectValue: config.autoSelectValue,
      translations: config.translations,
      addRuleToNewGroups: config.addRuleToNewGroups,
      listsAsArrays: config.listsAsArrays,
      resetOnFieldChange: config.resetOnFieldChange,
      resetOnOperatorChange: config.resetOnOperatorChange,
      maxLevels,
      disabledPaths,
      queryDisabled: props.disabled === true,
    };
  };

  const manager =
    (initialProps.manager as QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>) ??
    new QueryManager<RuleGroupTypeAny, F, O, FullCombinator>(
      undefined,
      untrack(() => buildManagerOptions())
    );

  if (!initialProps.manager) {
    const candidate = resolveCandidateQuery(
      {
        query: initialProps.query,
        defaultQuery: initialProps.defaultQuery,
        fallbackQuery: manager.getQuery(),
      },
      { idGenerator: initialProps.idGenerator }
    );
    if (!Object.is(candidate, manager.getQuery())) {
      setManagerQuery(manager, candidate);
      // Seeding the query is not a user action, so it must not be undoable. Without this,
      // `UndoRedoActions` would render an enabled "undo" button on first paint.
      manager.clearHistory();
    }
  }
  // #endregion

  // #region Option lists
  // Read off the manager, which prepares them from the same options—including `translations`,
  // which supplies the placeholder options when `autoSelect*` is `false`. Keyed on
  // `configVersion` so that a reconfigure (see below) refreshes them.
  let configVersion = $state.raw(manager.getConfigVersion());

  const fields = $derived.by(() => {
    void configVersion;
    return manager.getFields();
  });
  const combinators = $derived.by(() => {
    void configVersion;
    return manager.getCombinators();
  });
  const fieldMap = $derived(
    Object.fromEntries(
      toFlatOptionArray(fields as FullOptionList<FullOption>).map(f => [f.value ?? f.name, f])
    ) as Partial<FullOptionRecord<F>>
  );
  // #endregion

  // #region Resolvers
  const getParameters = (
    field?: string,
    operator?: string,
    misc?: { fieldData: F }
  ): FullOptionList<FullOption> =>
    prepareOptionList<FullOption>({
      optionList: getProps().getParameters?.(field as FName, operator as OName, misc) ?? [],
      autoSelectOption: true,
    }).optionList;

  const getOperators = (field: string): FullOptionList<O> =>
    manager.getOperators(field) as FullOptionList<O>;

  const getValueEditorType = (field: string, operator: string): ValueEditorType =>
    manager.getValueEditorType(field, operator);

  const getValues = (field: string, operator: string): FullOptionList<Option> =>
    manager.getValues(field, operator);

  const getValueSources = (field: string, operator: string): ValueSourceFullOptions =>
    manager.getValueSources(field, operator);

  const getMatchModes = (field: string): MatchModeOptions => manager.getMatchModes(field);

  const getInputType = (
    field: string,
    operator: string,
    { fieldData }: { fieldData: F }
  ): InputType | null =>
    getProps().getInputType?.(field as FName, operator as OName, { fieldData }) ?? 'text';

  const getSubQueryBuilderProps = (
    field: string,
    misc: { fieldData: F }
    // oxlint-disable-next-line typescript/no-explicit-any
  ): any => getProps().getSubQueryBuilderProps?.(field as FName, misc) ?? {};

  // The manager computes rule defaults internally for `createRule`; these expose the same
  // derivation to the schema, so they must stay in sync with the manager's option lists.
  const getRuleDefaultValueMain = (rule: RuleType): unknown =>
    getRuleDefaultValue<F>(rule, {
      fieldData: manager.getFieldData(rule.field),
      fields,
      getParameters,
      getValueEditorType,
      getValues,
      listsAsArrays: config.listsAsArrays,
      getDefaultValue: getProps().getDefaultValue as never,
    });

  const getRuleDefaultOperator = (field: string): string =>
    resolveDefaultOperator<F>({
      field,
      fieldData: manager.getFieldData(field),
      getDefaultOperator: getProps().getDefaultOperator as never,
      getOperators,
    });
  // #endregion

  // #region Query state
  // `$state.raw`, not `$state`: queries are immutable and are replaced wholesale, and a deep
  // proxy would both defeat reference comparison and be rejected by the manager's deep freeze.
  let query = $state.raw<RuleGroupTypeAny>(manager.getQuery());
  let hasNotifiedMount = false;
  // A non-reactive mirror of `query`. The subscription callback runs synchronously inside
  // whichever effect triggered the mutation, so reading `query` there would make that effect
  // depend on the state it just caused to change.
  let committed = manager.getQuery();

  const commit = (nextQuery: RuleGroupTypeAny) => {
    query = nextQuery;
    committed = nextQuery;
    getProps().onQueryChange?.(nextQuery as never);
    options.writeBack?.(nextQuery);
  };

  // Subscribe once, on mount. Nothing in here is tracked: the body both reads and writes
  // `query`, so tracking it would make the effect retrigger itself.
  $effect(() =>
    untrack(() => {
      const unsubscribe = manager.subscribe(() => {
        // A reconfigure notifies without touching the query. Refresh the config version
        // unconditionally, but only commit—and therefore only fire `onQueryChange`—when the
        // query actually changed.
        configVersion = manager.getConfigVersion();
        const nextQuery = manager.getQuery();
        if (!Object.is(nextQuery, committed)) {
          commit(nextQuery);
        }
      });

      // Catch up on anything that changed between initialization and mount.
      if (!Object.is(query, manager.getQuery())) {
        commit(manager.getQuery());
      } else if (!hasNotifiedMount && config.enableMountQueryChange) {
        hasNotifiedMount = true;
        getProps().onQueryChange?.(query as never);
        options.writeBack?.(query);
      }

      return unsubscribe;
    })
  );

  // Controlled mode: a new `query` prop is pushed into the manager. The guard—reference
  // equality first, then a structural signature—is what prevents a feedback loop with the
  // subscription above. Reference equality alone is not enough: a parent that stores the query
  // in `$state` hands back a deeply reactive proxy of the very object we just emitted.
  $effect(() => {
    const nextQuery = getProps().query;
    if (
      nextQuery &&
      !Object.is(nextQuery, manager.getQuery()) &&
      manager.signatureOf(nextQuery) !== unchangedSignature
    ) {
      setManagerQuery(manager, nextQuery);
    }
  });

  // Structural options are applied in place, so the query, the undo/redo history, and every
  // subscriber survive a config change. Skipped for an externally supplied manager: that one
  // belongs to the consumer.
  if (!initialProps.manager) {
    let appliedSignature = untrack(() => structuralOptions());

    $effect(() => {
      // Reading the signature is what registers the dependencies: the structural props plus the
      // parts of `config` the manager consumes. Function props are deliberately excluded—they
      // reach the manager through `live()` closures and stay current on their own, and comparing
      // them would defeat the equality gate below for anyone passing inline arrows.
      const next = structuralOptions();
      if (valuesEqual(next, appliedSignature)) return;
      appliedSignature = next;

      untrack(() => {
        const nextOptions = buildManagerOptions();
        try {
          manager.reconfigure(nextOptions);
        } catch {
          // Same problem as `setManagerQuery`: the manager freezes the option lists, which
          // throws for a deeply reactive `$state` proxy. Every key is present in the rebuilt
          // options, so re-applying from a snapshot fully overwrites the partial attempt.
          manager.reconfigure({
            ...nextOptions,
            fields: $state.snapshot(nextOptions.fields) as typeof nextOptions.fields,
            operators: $state.snapshot(nextOptions.operators) as typeof nextOptions.operators,
            combinators: $state.snapshot(nextOptions.combinators) as typeof nextOptions.combinators,
            disabledPaths: $state.snapshot(nextOptions.disabledPaths) as Path[],
          });
        }
      });
    });
  }
  // #endregion

  const actions = createActions(getProps, manager);

  // #region Derived config
  const independentCombinators = $derived(isRuleGroupTypeIC(query));
  const queryDisabled = $derived(getProps().disabled === true);
  const rootGroupDisabled = $derived(!!query.disabled || disabledPaths.some(p => p.length === 0));

  const validationResult = $derived.by(() => {
    const { validator } = getProps();
    return typeof validator === 'function' ? validator(query) : emptyValidationMap;
  });
  const validationMap = $derived(
    typeof validationResult === 'boolean' ? emptyValidationMap : validationResult
  );

  const wrapperClassName = $derived(
    deriveQueryBuilderClassNames({
      classNames: config.classNames,
      suppressStandardClassnames: config.suppressStandardClassnames,
      disabled: queryDisabled,
      validationResult,
    })
  );

  const inlineCombinatorsAttr = $derived(
    independentCombinators || config.showCombinatorsBetweenRules ? 'enabled' : 'disabled'
  );
  // #endregion

  const schema = $derived<Schema<F, OName>>({
    manager: manager as unknown as QueryManager<
      RuleGroupTypeAny,
      FullField,
      FullOperator,
      FullCombinator
    >,
    fields,
    fieldMap: fieldMap as Schema<F, OName>['fieldMap'],
    classNames: config.classNames,
    combinators,
    controls: config.controls,
    getParameters,
    createRule: () => manager.createRule(),
    createRuleGroup: (ic?: boolean) => manager.createRuleGroup(ic ?? independentCombinators),
    getQuery: manager.getQuery,
    getOperators: getOperators as Schema<F, OName>['getOperators'],
    getValueEditorType,
    getValueEditorSeparator: (field, operator, misc) =>
      (getProps().getValueEditorSeparator ?? defaultGetValueEditorSeparator)(
        field as FName,
        operator as OName,
        misc
      ),
    getValueSources: (field, operator) => getValueSources(field, operator),
    getInputType,
    getValues,
    getRuleDefaultValue: getRuleDefaultValueMain,
    getRuleDefaultOperator,
    getMatchModes: (field: string) => getMatchModes(field),
    getSubQueryBuilderProps,
    getRuleClassname: (rule, misc) =>
      (getProps().getRuleClassname ?? defaultGetRuleOrGroupClassname)(rule as never, misc),
    getRuleGroupClassname: ruleGroup =>
      (getProps().getRuleGroupClassname ?? defaultGetRuleOrGroupClassname)(ruleGroup as never),
    accessibleDescriptionGenerator:
      getProps().accessibleDescriptionGenerator ?? generateAccessibleDescription,
    showCombinatorsBetweenRules: config.showCombinatorsBetweenRules,
    showNotToggle: config.showNotToggle,
    showShiftActions: config.showShiftActions,
    showUndoRedo: config.showUndoRedo,
    showCloneButtons: config.showCloneButtons,
    showLockButtons: config.showLockButtons,
    showMuteButtons: config.showMuteButtons,
    autoSelectField: config.autoSelectField,
    autoSelectOperator: config.autoSelectOperator,
    autoSelectValue: config.autoSelectValue,
    addRuleToNewGroups: config.addRuleToNewGroups,
    enableDragAndDrop: config.enableDragAndDrop,
    validationMap,
    independentCombinators,
    listsAsArrays: config.listsAsArrays,
    parseNumbers: getProps().parseNumbers ?? false,
    disabledPaths,
    suppressStandardClassnames: config.suppressStandardClassnames,
    maxLevels,
    resetOnFieldChange: config.resetOnFieldChange,
    resetOnOperatorChange: config.resetOnOperatorChange,
  });

  const contextValue = $derived<QueryBuilderContextProps<F, OName>>({
    controlElements: config.controls,
    controlClassnames: config.classNames,
    translations: config.translations,
    debugMode: config.debugMode,
    enableMountQueryChange: config.enableMountQueryChange,
    showCombinatorsBetweenRules: config.showCombinatorsBetweenRules,
    showNotToggle: config.showNotToggle,
    showShiftActions: config.showShiftActions,
    showUndoRedo: config.showUndoRedo,
    showCloneButtons: config.showCloneButtons,
    showLockButtons: config.showLockButtons,
    showMuteButtons: config.showMuteButtons,
    resetOnFieldChange: config.resetOnFieldChange,
    resetOnOperatorChange: config.resetOnOperatorChange,
    autoSelectField: config.autoSelectField,
    autoSelectOperator: config.autoSelectOperator,
    autoSelectValue: config.autoSelectValue,
    addRuleToNewGroups: config.addRuleToNewGroups,
    listsAsArrays: config.listsAsArrays,
    suppressStandardClassnames: config.suppressStandardClassnames,
  });

  return {
    get query() {
      return query;
    },
    get rootGroup() {
      return query;
    },
    get manager() {
      return manager as QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
    },
    get schema() {
      return schema;
    },
    get actions() {
      return actions;
    },
    get translations() {
      return config.translations;
    },
    get controls() {
      return config.controls;
    },
    get classNames() {
      return config.classNames;
    },
    get wrapperClassName() {
      return wrapperClassName;
    },
    get dndEnabledAttr() {
      return 'disabled';
    },
    get inlineCombinatorsAttr() {
      return inlineCombinatorsAttr;
    },
    get rootGroupDisabled() {
      return rootGroupDisabled;
    },
    get queryDisabled() {
      return queryDisabled;
    },
    get independentCombinators() {
      return independentCombinators;
    },
    get context() {
      return contextValue;
    },
  };
};
