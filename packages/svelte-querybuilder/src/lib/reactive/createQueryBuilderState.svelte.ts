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
 * read once, when the manager is constructed. Function props (`getOperators`, `getDefaultValue`,
 * etc.) are forwarded through closures, so those stay live. Rendering always reflects the
 * current props regardless.
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
  const maxLevels = (initialProps.maxLevels ?? 0) > 0 ? Number(initialProps.maxLevels) : Infinity;
  const disabledPathsInit = Array.isArray(initialProps.disabled)
    ? initialProps.disabled
    : emptyDisabledPaths;

  // Read once: the manager's structural options are fixed for its lifetime.
  const initialConfig = untrack(() => config);

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

  const managerOptions: QueryManagerOptions<F, O, FullCombinator> = {
    fields: initialProps.fields,
    operators: initialProps.operators,
    combinators: initialProps.combinators,
    baseField: initialProps.baseField,
    baseOperator: initialProps.baseOperator,
    baseCombinator: initialProps.baseCombinator,
    autoSelectField: initialConfig.autoSelectField,
    autoSelectOperator: initialConfig.autoSelectOperator,
    autoSelectValue: initialConfig.autoSelectValue,
    // The manager prepares every option list, including the placeholder options, so it needs the
    // merged translations. Everything rendered here reads those lists back off the manager.
    translations: initialConfig.translations,
    addRuleToNewGroups: initialConfig.addRuleToNewGroups,
    listsAsArrays: initialConfig.listsAsArrays,
    resetOnFieldChange: initialConfig.resetOnFieldChange,
    resetOnOperatorChange: initialConfig.resetOnOperatorChange,
    maxLevels,
    disabledPaths: disabledPathsInit,
    queryDisabled: initialProps.disabled === true,
    history: true,
    validator: initialProps.validator,
    idGenerator: initialProps.idGenerator,
    // Forwarded so that changes to these props take effect without rebuilding the manager.
    getDefaultField: initialProps.getDefaultField as never,
    getDefaultOperator: (typeof initialProps.getDefaultOperator === 'function'
      ? live(p => p.getDefaultOperator)
      : initialProps.getDefaultOperator) as never,
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

  const manager =
    (initialProps.manager as QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>) ??
    new QueryManager<RuleGroupTypeAny, F, O, FullCombinator>(undefined, managerOptions);

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
  // which supplies the placeholder options when `autoSelect*` is `false`. Fixed for the
  // manager's lifetime, so a changed `fields`/`operators`/`combinators`/`translations` prop does
  // not update them.
  const fields = manager.getFields();
  const combinators = manager.getCombinators();
  const fieldMap = Object.fromEntries(
    toFlatOptionArray(fields as FullOptionList<FullOption>).map(f => [f.value ?? f.name, f])
  ) as Partial<FullOptionRecord<F>>;
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

  const commit = (nextQuery: RuleGroupTypeAny) => {
    query = nextQuery;
    getProps().onQueryChange?.(nextQuery as never);
    options.writeBack?.(nextQuery);
  };

  // Subscribe once, on mount. Nothing in here is tracked: the body both reads and writes
  // `query`, so tracking it would make the effect retrigger itself.
  $effect(() =>
    untrack(() => {
      const unsubscribe = manager.subscribe(() => {
        commit(manager.getQuery());
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
  // #endregion

  const actions = createActions(getProps, manager);

  // #region Derived config
  const independentCombinators = $derived(isRuleGroupTypeIC(query));
  const disabledPaths = $derived(
    Array.isArray(getProps().disabled) ? (getProps().disabled as Path[]) : emptyDisabledPaths
  );
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
    manager: manager as QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>,
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
