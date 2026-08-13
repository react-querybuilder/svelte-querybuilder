import type {
  Classname,
  Classnames,
  DefaultFieldProp,
  DefaultOperatorProp,
  FlexibleOptionList,
  FlexibleOptionListProp,
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
  RuleGroupTypeAny,
  RuleType,
  ValidationMap,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import {
  createQueryActions,
  createRule,
  createRuleGroup,
  defaultCombinators,
  defaultMaxHistory,
  defaultOperatorLabelMap,
  defaultOperators,
  deriveQueryBuilderClassNames,
  generateAccessibleDescription,
  generateID,
  getFieldData,
  getMatchModesUtil,
  getRuleDefaultValue,
  getValueSourcesUtil,
  isRuleGroupTypeIC,
  prepareOptionList,
  prepareRuleGroup,
  resolveCandidateQuery,
  resolveDefaultOperator,
  resolveOperatorList,
  resolveValueEditorType,
  resolveValueList,
  shouldCoalesce,
  signatureOf,
  unchangedSignature,
} from '@react-querybuilder/core';
import type { Controls } from '../types/controls.js';
import type { QueryBuilderContextProps, QueryBuilderProps } from '../types/props.js';
import type { QueryHistory, Schema } from '../types/schema.js';
import type { LabelNode, TranslationsFull } from '../types/translations.js';
import type { MergedQueryBuilderConfig } from './context.svelte.js';
import { getQueryBuilderContext, mergeQueryBuilderConfig } from './context.svelte.js';

const emptyValidationMap: ValidationMap = {};
const emptyDisabledPaths: Path[] = [];
const defaultGetValueEditorSeparator = (): LabelNode => '';
const defaultGetRuleOrGroupClassname = (): string => '';

/**
 * Everything a `QueryBuilder` component needs to render, derived from its props.
 *
 * The query and its undo/redo stacks are held in runes; every derivation is a `$derived` over
 * one of core's pure resolvers. Nothing here is stateful outside the reactive graph, so there
 * is no subscription, no cache-invalidation token, and no configuration to re-apply.
 */
export interface QueryBuilderState<F extends FullField, O extends string> {
  /** The current query. */
  readonly query: RuleGroupTypeAny;
  /** Alias for {@link QueryBuilderState.query}. */
  readonly rootGroup: RuleGroupTypeAny;
  readonly schema: Schema<F, O>;
  readonly actions: QueryActions;
  readonly history: QueryHistory;
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
   * Default components for every control, applied last in the control merge. Provided
   * by the component layer so that this module stays free of component imports.
   */
  defaultControls?: Partial<Controls<F, O>>;
  /**
   * A getter for the inherited context. Defaults to {@link getQueryBuilderContext}, which is
   * only available during component initialization.
   */
  context?: () => QueryBuilderContextProps<F, O> | undefined;
  /**
   * Called with each committed query, after `onQueryChange`. `QueryBuilder.svelte` uses it to
   * write back to the `$bindable` `query` prop, which can only be assigned from a component.
   */
  writeBack?: (query: RuleGroupTypeAny) => void;
}

/**
 * Builds the reactive state for a query builder.
 *
 * Must be called during component initialization.
 *
 * The query can be driven three ways, and the same state object serves all three:
 *
 * - `bind:query` — the committed query is written back through `options.writeBack`.
 * - `query` + `onQueryChange` — controlled. The `query` prop always wins: a local mutation that
 *   the consumer declines to apply is reverted on the next read.
 * - `defaultQuery`, or nothing at all — uncontrolled.
 *
 * Configuration is never "applied" anywhere. Option lists, resolvers, and the schema are all
 * `$derived` over the props, so a changed prop simply invalidates whatever depended on it.
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

  const getInheritedContext = options.context ?? getQueryBuilderContext<F, OName>();

  const config = $derived(
    mergeQueryBuilderConfig<F, OName>({
      props: getProps(),
      // Called from inside the derivation, so a config change upstream propagates.
      context: getInheritedContext?.(),
      defaultControls: options.defaultControls,
    }) satisfies MergedQueryBuilderConfig<F, OName>
  );

  const initialProps = getProps();

  const idGenerator = (): string => (getProps().idGenerator ?? generateID)();

  const maxLevels = $derived(
    (getProps().maxLevels ?? 0) > 0 ? Number(getProps().maxLevels) : Infinity
  );
  const disabledPaths = $derived(
    Array.isArray(getProps().disabled) ? (getProps().disabled as Path[]) : emptyDisabledPaths
  );
  const queryDisabled = $derived(getProps().disabled === true);

  // #region Props → core callbacks
  // The props type keys field and operator names as `GetOptionIdentifierType<F>`/`<O>`, while
  // core's resolvers take plain strings. The two are assignment-compatible in the value
  // direction only, so the widening happens once, here, rather than at each of the ~20 call
  // sites. Read through `getProps()` so a changed callback prop takes effect immediately.
  const callbacks = $derived(
    getProps() as unknown as {
      getDefaultField?: DefaultFieldProp<F>;
      getDefaultOperator?: DefaultOperatorProp<F>;
      getDefaultValue?: (rule: RuleType, misc: { fieldData: F }) => unknown;
      getOperators?: (field: string, misc: { fieldData: F }) => FlexibleOptionList<O> | null;
      getValueEditorType?: (
        field: string,
        operator: string,
        misc: { fieldData: F }
      ) => ValueEditorType;
      getValues?: (
        field: string,
        operator: string,
        misc: { fieldData: F }
      ) => FlexibleOptionList<Option>;
      getValueSources?: (
        field: string,
        operator: string,
        misc: { fieldData: F }
      ) => ValueSourceFullOptions;
      getMatchModes?: (field: string, misc: { fieldData: F }) => MatchModeOptions;
      getParameters?: (
        field: string,
        operator: string,
        misc: { fieldData: F }
      ) => FlexibleOptionList<Option>;
      getInputType?: (field: string, operator: string, misc: { fieldData: F }) => InputType | null;
      getSubQueryBuilderProps?: (field: string, misc: { fieldData: F }) => object;
      getRuleClassname?: (rule: RuleType, misc: { fieldData: F }) => Classname;
      getRuleGroupClassname?: (ruleGroup: RuleGroupTypeAny) => Classname;
      onQueryChange?: (query: RuleGroupTypeAny) => void;
    }
  );
  // #endregion

  // #region Option lists
  const preparedFields = $derived(
    prepareOptionList<F>({
      optionList: getProps().fields,
      baseOption: getProps().baseField,
      autoSelectOption: config.autoSelectField,
      placeholder: config.translations.fields,
    })
  );
  const fields = $derived(preparedFields.optionList);
  const fieldMap = $derived(preparedFields.optionsMap as Partial<FullOptionRecord<F>>);

  const operators = $derived(
    prepareOptionList<O>({
      optionList: (getProps().operators ?? defaultOperators) as FlexibleOptionListProp<O>,
      baseOption: getProps().baseOperator,
      labelMap: defaultOperatorLabelMap,
      autoSelectOption: config.autoSelectOperator,
      placeholder: config.translations.operators,
    }).optionList
  );

  const combinators = $derived(
    prepareOptionList<FullCombinator>({
      optionList: (getProps().combinators ??
        defaultCombinators) as FlexibleOptionListProp<FullCombinator>,
      baseOption: getProps().baseCombinator,
    }).optionList
  );
  // #endregion

  // #region Resolvers
  // Direct ports of `QueryManager`'s private resolution methods. Each is a plain function over
  // `$derived` values rather than a `$derived` itself, since they take arguments.
  const fieldDataFor = (field: string): F => getFieldData(field, fieldMap) as F;

  const getOperators = (field: string): FullOptionList<O> =>
    resolveOperatorList<F, O>({
      field,
      fieldData: fieldDataFor(field),
      getOperators: callbacks.getOperators,
      operators,
      baseOption: getProps().baseOperator,
      autoSelectOption: config.autoSelectOperator,
      placeholder: config.translations.operators,
    });

  const getRuleDefaultOperator = (field: string): string =>
    resolveDefaultOperator<F>({
      field,
      fieldData: fieldDataFor(field),
      getDefaultOperator: callbacks.getDefaultOperator,
      getOperators,
    });

  const getValueSources = (field: string, operator: string): ValueSourceFullOptions =>
    getValueSourcesUtil<F, string>(fieldDataFor(field), operator, callbacks.getValueSources);

  const getMatchModes = (field: string): MatchModeOptions =>
    getMatchModesUtil<F>(fieldDataFor(field), callbacks.getMatchModes);

  const getValues = (field: string, operator: string): FullOptionList<Option> =>
    resolveValueList<F>({
      field,
      operator,
      fieldData: fieldDataFor(field),
      getValues: callbacks.getValues,
      autoSelectOption: config.autoSelectValue,
      placeholder: config.translations.values,
    });

  const getValueEditorType = (field: string, operator: string): ValueEditorType =>
    resolveValueEditorType<F>({
      field,
      operator,
      fieldData: fieldDataFor(field),
      getValueEditorType: callbacks.getValueEditorType,
    });

  const getParameters = (
    field?: string,
    operator?: string,
    misc?: { fieldData: F }
  ): FullOptionList<FullOption> =>
    prepareOptionList<FullOption>({
      optionList: (callbacks.getParameters?.(field!, operator!, misc!) ??
        []) as FlexibleOptionListProp<FullOption>,
      // Deliberately not `autoSelectValue`: a parameter list is never given a placeholder
      // option, since an empty parameter list must stay empty.
      autoSelectOption: true,
    }).optionList;

  const getRuleDefaultValueMain = (rule: RuleType): unknown =>
    getRuleDefaultValue<F>(rule, {
      fieldData: fieldDataFor(rule.field),
      fields,
      listsAsArrays: config.listsAsArrays,
      getValueEditorType,
      getValues,
      getDefaultValue: callbacks.getDefaultValue,
      getParameters: callbacks.getParameters && getParameters,
    });

  const getInputType = (
    field: string,
    operator: string,
    misc: { fieldData: F }
  ): InputType | null => callbacks.getInputType?.(field, operator, misc) ?? 'text';

  const getSubQueryBuilderProps = (
    field: string,
    misc: { fieldData: F }
    // oxlint-disable-next-line typescript/no-explicit-any
  ): any => callbacks.getSubQueryBuilderProps?.(field, misc) ?? {};

  const createRuleMain = (): RuleType =>
    createRule<F>({
      fields,
      getDefaultField: callbacks.getDefaultField,
      getRuleDefaultOperator,
      getValueSources,
      getMatchModes,
      getRuleDefaultValue: getRuleDefaultValueMain,
      idGenerator,
    });

  const createRuleGroupMain = (independentCombinatorsArg?: boolean): RuleGroupTypeAny =>
    createRuleGroup<FullCombinator>(
      {
        combinators,
        addRuleToNewGroups: config.addRuleToNewGroups,
        createRule: createRuleMain,
        idGenerator,
      },
      independentCombinatorsArg
    );
  // #endregion

  // #region Query state
  const seededQuery = resolveCandidateQuery(
    {
      query: initialProps.query,
      defaultQuery: initialProps.defaultQuery,
      fallbackQuery: createRuleGroupMain(),
    },
    { idGenerator }
  );

  /**
   * Whether the initial query was created or normalized here rather than handed over ready to
   * use. If so the consumer has never seen it, so it is emitted once during initialization —
   * that is the entire job the `enableMountQueryChange` prop used to do, minus the flag.
   * `RuleSubQuery` relies on it to seed a match-mode rule's `value`.
   */
  const wasSeeded = !Object.is(seededQuery, initialProps.query ?? initialProps.defaultQuery);

  /**
   * The locally committed query. `$state.raw` because queries are immutable and replaced
   * wholesale: a deep proxy would defeat the reference comparisons below for no benefit.
   */
  let local = $state.raw<RuleGroupTypeAny>(seededQuery);

  /**
   * The derivation's memory: the last value {@link query} resolved to, plus the last `query`
   * prop and last local commit it saw. Plain variables rather than state — they are written from
   * inside the derivation, which is only legal because nothing reads them reactively. They exist
   * so the derivation can tell "the prop changed" from "the local query changed" without an
   * `$effect` mirroring one into the other.
   */
  let lastResolved: RuleGroupTypeAny = seededQuery;
  let lastPropQuery = initialProps.query;
  let lastLocal = seededQuery;

  /**
   * The query to render.
   *
   * The `query` prop is an *input*, not the authority: it wins whenever it changes, and local
   * commits stand in between. That covers every driving mode — a controlled consumer updates the
   * prop from `onQueryChange`, an uncontrolled one never passes it at all, and `bind:query` does
   * both.
   *
   * The signature check is what keeps `bind:query` from thrashing. A parent holding the query in
   * deep `$state` hands back a reactive proxy of the very object just emitted, so reference
   * equality alone would not recognize it; `unchangedSignature` means "no observable
   * difference", in which case the current object is kept and identity is preserved.
   */
  const query = $derived.by<RuleGroupTypeAny>(() => {
    const committed = local;
    const incoming = getProps().query;

    // A local commit since the last resolution supersedes whatever was resolved then.
    if (!Object.is(committed, lastLocal)) {
      lastLocal = committed;
      lastResolved = committed;
    }

    if (
      incoming &&
      !Object.is(incoming, lastPropQuery) &&
      !Object.is(incoming, lastResolved) &&
      signatureOf(lastResolved, incoming) !== unchangedSignature
    ) {
      lastResolved = incoming.id ? incoming : prepareRuleGroup(incoming, { idGenerator });
    }

    lastPropQuery = incoming;
    return lastResolved;
  });
  // #endregion

  // #region History
  // `past` oldest first, `future` newest first, mirroring `QueryManager.getHistory`. Coalescing
  // is core's `shouldCoalesce`, so the two implementations cannot drift.
  let past = $state.raw<RuleGroupTypeAny[]>([]);
  let future = $state.raw<RuleGroupTypeAny[]>([]);
  let lastSig: string | undefined;
  let lastAt = 0;

  const record = (prev: RuleGroupTypeAny, next: RuleGroupTypeAny): void => {
    const sig = signatureOf(prev, next);
    // The object changed but nothing observable did, so an entry would appear to do nothing.
    if (sig === unchangedSignature) return;

    const now = Date.now();
    if (!shouldCoalesce(lastSig, sig, lastAt, now)) {
      past = [...past, prev].slice(-defaultMaxHistory);
      future = [];
    }
    lastSig = sig;
    lastAt = now;
  };

  /** Applies a query and notifies, without touching the history stacks. */
  const emit = (next: RuleGroupTypeAny): void => {
    local = next;
    callbacks.onQueryChange?.(next);
    options.writeBack?.(next);
  };

  /** Applies a query as a user action: recorded in the history, then emitted. */
  const commit = (next: RuleGroupTypeAny): void => {
    const prev = query;
    if (Object.is(prev, next)) return;
    record(prev, next);
    emit(next);
  };

  const history: QueryHistory = {
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    undo() {
      if (past.length === 0) return;
      future = [query, ...future];
      const restored = past.at(-1)!;
      past = past.slice(0, -1);
      // Prevent the next change from coalescing into the restored entry.
      lastSig = undefined;
      emit(restored);
    },
    redo() {
      if (future.length === 0) return;
      past = [...past, query];
      const restored = future[0];
      future = future.slice(1);
      lastSig = undefined;
      emit(restored);
    },
    clear() {
      past = [];
      future = [];
      lastSig = undefined;
    },
  };
  // #endregion

  // #region Actions
  // Core owns the whole policy layer here: disabled/`maxLevels` gating, the confirmation
  // callback protocol, and debug logging. `freeze: false` because the query may contain Svelte
  // `$state` proxies (a parent's deeply reactive query, or a value produced by `getDefaultValue`),
  // and immer's deep freeze throws on those.
  const handlers = $derived(
    createQueryActions({
      combinators,
      idGenerator,
      maxLevels,
      queryDisabled,
      disabledPaths,
      resetOnFieldChange: config.resetOnFieldChange,
      resetOnOperatorChange: config.resetOnOperatorChange,
      getRuleDefaultOperator,
      getValueSources,
      getRuleDefaultValue: getRuleDefaultValueMain,
      getMatchModes,
      freeze: false,
      onAddRule: getProps().onAddRule,
      onAddGroup: getProps().onAddGroup,
      onRemove: getProps().onRemove,
      onMoveRule: getProps().onMoveRule,
      onMoveGroup: getProps().onMoveGroup,
      onGroupRule: getProps().onGroupRule,
      onGroupGroup: getProps().onGroupGroup,
      onLog: config.debugMode ? (getProps().onLog ?? console.log) : undefined,
    })
  );

  /** Applies a handler's result, treating `undefined` (aborted) as a no-op. */
  const applyResult = (next: RuleGroupTypeAny | undefined): void => {
    if (next !== undefined) commit(next);
  };

  const actions: QueryActions = {
    onRuleAdd: (rule, parentPath, context) =>
      applyResult(handlers.addRule(query, rule, parentPath, context)),
    onGroupAdd: (group, parentPath, context) =>
      applyResult(handlers.addGroup(query, group, parentPath, context)),
    onPropChange: (prop, value, path) => applyResult(handlers.propChange(query, prop, value, path)),
    // The `context` parameter is optional in every case, which is what makes these assignable
    // to core's `QueryActions` signatures — several of which declare no `context` at all.
    // oxlint-disable-next-line typescript/no-explicit-any
    onRuleRemove: (path: Path, context?: any) =>
      applyResult(handlers.removeRuleOrGroup(query, path, context)),
    // oxlint-disable-next-line typescript/no-explicit-any
    onGroupRemove: (path: Path, context?: any) =>
      applyResult(handlers.removeRuleOrGroup(query, path, context)),
    moveRule: (oldPath, newPath, clone, context) =>
      applyResult(handlers.moveRule(query, oldPath, newPath, clone, context)),
    groupRule: (sourcePath, targetPath, clone, context) =>
      applyResult(handlers.groupRule(query, sourcePath, targetPath, clone, context)),
  };
  // #endregion

  // #region Derived config
  const independentCombinators = $derived(isRuleGroupTypeIC(query));
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
    fields,
    fieldMap: fieldMap as Schema<F, OName>['fieldMap'],
    classNames: config.classNames,
    combinators,
    controls: config.controls,
    history,
    getParameters,
    createRule: createRuleMain,
    createRuleGroup: (ic?: boolean) => createRuleGroupMain(ic ?? independentCombinators),
    getQuery: () => query,
    getOperators: getOperators as Schema<F, OName>['getOperators'],
    getValueEditorType,
    getValueEditorSeparator: (field, operator, misc) =>
      (getProps().getValueEditorSeparator ?? defaultGetValueEditorSeparator)(
        field as FName,
        operator as OName,
        misc
      ),
    getValueSources,
    getInputType,
    getValues,
    getRuleDefaultValue: getRuleDefaultValueMain,
    getRuleDefaultOperator,
    getMatchModes,
    getSubQueryBuilderProps,
    getRuleClassname: (rule, misc) =>
      (callbacks.getRuleClassname ?? defaultGetRuleOrGroupClassname)(rule, misc),
    getRuleGroupClassname: ruleGroup =>
      (callbacks.getRuleGroupClassname ?? defaultGetRuleOrGroupClassname)(ruleGroup),
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
    controls: config.controls,
    controlClassnames: config.classNames,
    translations: config.translations,
    debugMode: config.debugMode,
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

  // A seeded query has never been seen by the consumer, so hand it over. Deliberately last, so
  // the callback observes a fully constructed state object.
  if (wasSeeded) {
    callbacks.onQueryChange?.(seededQuery);
    options.writeBack?.(seededQuery);
  }

  return {
    get query() {
      return query;
    },
    get rootGroup() {
      return query;
    },
    get schema() {
      return schema;
    },
    get actions() {
      return actions;
    },
    get history() {
      return history;
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
