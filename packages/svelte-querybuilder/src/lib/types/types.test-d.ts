/**
 * Type-level tests. Not executed by Vitest; compiled by `svelte-check`, which is where the
 * assertions below are enforced. Any error here fails `bun run check`.
 */
import type {
  FullCombinator,
  FullField,
  FullOperator,
  QueryManager,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleGroupTypeIC,
} from '@react-querybuilder/core';
import type {
  ActionProps,
  Controls,
  ControlElementsProp,
  QueryBuilderProps,
  RuleGroupProps,
  RuleProps,
  Schema,
  Translations,
  ValueEditorProps,
} from './index';

declare function assertType<T>(value: T): void;

// #region QueryBuilderProps — independent combinators
type ICProps = QueryBuilderProps<RuleGroupTypeIC, FullField, FullOperator, FullCombinator>;

declare const icProps: ICProps;

assertType<RuleGroupTypeIC | undefined>(icProps.query);
assertType<RuleGroupTypeIC | undefined>(icProps.defaultQuery);
assertType<QueryManager<RuleGroupTypeIC, FullField, FullOperator, FullCombinator> | undefined>(
  icProps.manager
);
assertType<((query: RuleGroupTypeIC) => void) | undefined>(icProps.onQueryChange);

// The `combinator`-bearing variant is a distinct, non-assignable type.
type StdProps = QueryBuilderProps<RuleGroupType, FullField, FullOperator, FullCombinator>;
declare const stdProps: StdProps;
// @ts-expect-error `RuleGroupType` query is not a `RuleGroupTypeIC` query
assertType<RuleGroupTypeIC | undefined>(stdProps.query);

// All four type parameters default.
assertType<QueryBuilderProps>(stdProps);
// #endregion

// #region Removed props
// @ts-expect-error `qbId` does not exist (no Redux store; use `manager`)
assertType<string | undefined>(stdProps.qbId);
// @ts-expect-error drag-and-drop is a non-goal
assertType<boolean | undefined>(stdProps.enableDragAndDrop);
// @ts-expect-error deprecated in React Query Builder, removed here
assertType<boolean | undefined>(stdProps.independentCombinators);
// #endregion

// #region Controls
declare const controls: Controls<FullField, string>;
// Every entry is present and non-nullable after finalization, including `undoRedoActions`.
assertType<NonNullable<typeof controls.undoRedoActions>>(controls.undoRedoActions);
assertType<NonNullable<typeof controls.valueEditor>>(controls.valueEditor);

declare const controlElements: ControlElementsProp<FullField, string>;
// ...but `null` is accepted on the way in.
assertType<null | undefined | NonNullable<typeof controlElements.valueEditor>>(
  controlElements.valueEditor
);
// @ts-expect-error `dragHandle` is not a control element in this package
assertType<unknown>(controlElements.dragHandle);
// #endregion

// #region Rule/RuleGroup props — no deprecated per-prop fallbacks
declare const ruleProps: RuleProps;
// @ts-expect-error use `rule.field`
assertType<unknown>(ruleProps.field);
assertType<Schema<FullField, string>>(ruleProps.schema);
assertType<Translations>(ruleProps.translations);

declare const ruleGroupProps: RuleGroupProps;
// @ts-expect-error use `ruleGroup.combinator`
assertType<unknown>(ruleGroupProps.combinator);
// #endregion

// #region Schema
declare const schema: Schema<FullField, string>;
assertType<() => RuleGroupTypeAny>(schema.manager.getQuery);
// @ts-expect-error no Redux store
assertType<unknown>(schema.dispatchQuery);
// @ts-expect-error no query builder registry
assertType<unknown>(schema.qbId);
// #endregion

// #region Labels accept strings or snippets
declare const actionProps: ActionProps;
assertType<string | undefined>(actionProps.label as string | undefined);
declare const valueEditorProps: ValueEditorProps;
assertType<Schema<FullField, string>>(valueEditorProps.schema);
// #endregion
