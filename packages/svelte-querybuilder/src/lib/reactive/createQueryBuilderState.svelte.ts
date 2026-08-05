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
  defaultCombinatorLabelMap,
  defaultCombinators,
  defaultOperatorLabelMap,
  defaultOperators,
  deriveQueryBuilderClassNames,
  generateAccessibleDescription,
  getMatchModesUtil,
  getRuleDefaultValue,
  getValueSourcesUtil,
  isRuleGroupTypeIC,
  prepareOptionList,
  resolveCandidateQuery,
  resolveDefaultOperator,
  resolveOperatorList,
  resolveValueEditorType,
  resolveValueList,
  unchangedSignature,
} from '@react-querybuilder/core';
import { untrack } from 'svelte';
import type { Controls } from '../types/controls';
import type { QueryBuilderContextProps, QueryBuilderProps } from '../types/props';
import type { Schema } from '../types/schema';
import type { LabelNode, TranslationsFull } from '../types/translations';
import type { MergedQueryBuilderConfig } from './context.svelte';
import { getQueryBuilderContext, mergeQueryBuilderConfig } from './context.svelte';
import { createActions } from './createActions.svelte';

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

  // #region Option lists
  // Computed here rather than read from the manager because the placeholder options depend on
  // the merged translations, which the manager knows nothing about.
  const preparedFields = $derived(
    prepareOptionList<F>({
      placeholder: config.translations.fields,
      optionList: getProps().fields,
      autoSelectOption: config.autoSelectField,
      baseOption: getProps().baseField,
    })
  );
  const fields = $derived(preparedFields.optionList);
  const fieldMap = $derived(preparedFields.optionsMap as Partial<FullOptionRecord<F>>);

  const combinators = $derived(
    prepareOptionList<FullCombinator>({
      optionList: getProps().combinators ?? defaultCombinators,
      labelMap: defaultCombinatorLabelMap,
      baseOption: getProps().baseCombinator,
      autoSelectOption: true,
    }).optionList
  );

  const operators = $derived(
    prepareOptionList<O>({
      optionList: (getProps().operators ?? defaultOperators) as never,
      placeholder: config.translations.operators,
      labelMap: defaultOperatorLabelMap,
      baseOption: getProps().baseOperator,
      autoSelectOption: config.autoSelectOperator,
    }).optionList
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

  const getOperators = (field: string, { fieldData }: { fieldData: F }): FullOptionList<O> =>
    resolveOperatorList<F, O>({
      field,
      fieldData,
      getOperators: getProps().getOperators as never,
      operators,
      placeholder: config.translations.operators,
      baseOption: getProps().baseOperator,
      autoSelectOption: config.autoSelectOperator,
    });

  const getValueEditorType = (
    field: string,
    operator: string,
    { fieldData }: { fieldData: F }
  ): ValueEditorType =>
    resolveValueEditorType<F>({
      field,
      operator,
      fieldData,
      getValueEditorType: getProps().getValueEditorType as never,
    });

  const getValues = (
    field: string,
    operator: string,
    { fieldData }: { fieldData: F }
  ): FullOptionList<Option> =>
    resolveValueList<F>({
      field,
      operator,
      fieldData,
      getValues: getProps().getValues as never,
      placeholder: config.translations.values,
      autoSelectOption: config.autoSelectValue,
    });

  const getValueSources = (field: string, operator: string): ValueSourceFullOptions =>
    getValueSourcesUtil<F, string>(
      (fieldMap[field as FName] ?? {}) as F,
      operator,
      getProps().getValueSources as never
    );

  const getMatchModes = (field: string): MatchModeOptions =>
    getMatchModesUtil<F>((fieldMap[field as FName] ?? {}) as F, getProps().getMatchModes as never);

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

  const getRuleDefaultValueMain = (rule: RuleType): unknown =>
    getRuleDefaultValue<F>(rule, {
      fieldData: (fieldMap[rule.field as FName] ?? {}) as F,
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
      fieldData: (fieldMap[field as FName] ?? {}) as F,
      getDefaultOperator: getProps().getDefaultOperator as never,
      getOperators,
    });
  // #endregion

  // #region Manager
  const initialProps = getProps();
  const maxLevels = (initialProps.maxLevels ?? 0) > 0 ? Number(initialProps.maxLevels) : Infinity;
  const disabledPathsInit = Array.isArray(initialProps.disabled)
    ? initialProps.disabled
    : emptyDisabledPaths;

  // Read once: the manager's structural options are fixed for its lifetime.
  const initialConfig = untrack(() => config);

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
    getDefaultOperator: (field: string) => getRuleDefaultOperator(field),
    getDefaultValue: (rule: RuleType, _misc: { fieldData: F }) => getRuleDefaultValueMain(rule),
    getOperators: (field: string, misc: { fieldData: F }) => getOperators(field, misc) as never,
    getValueEditorType: (field: string, operator: string, misc: { fieldData: F }) =>
      getValueEditorType(field, operator, misc),
    getValues: (field: string, operator: string, misc: { fieldData: F }) =>
      getValues(field, operator, misc),
    getValueSources: (field: string, operator: string) => getValueSources(field, operator),
    getMatchModes: (field: string) => getMatchModes(field),
    getParameters: (field: string, operator: string, misc: { fieldData: F }) =>
      getParameters(field, operator, misc),
    getInputType: (field: string, operator: string, misc: { fieldData: F }) =>
      getInputType(field, operator, misc),
    getSubQueryBuilderProps: (field: string, misc: { fieldData: F }) =>
      getSubQueryBuilderProps(field, misc),
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
