/**
 * Type-level tests. Not executed by Vitest; compiled by `svelte-check`, which is where the
 * assertions below are enforced. Any error here fails `bun run check`.
 */
import type {
  FullCombinator,
  FullField,
  FullOperator,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleGroupTypeIC,
} from '@react-querybuilder/core';
import type { Component, Snippet } from 'svelte';
import type {
  ActionProps,
  Control,
  Controls,
  ControlsProp,
  ControlSnippetProps,
  QueryBuilderProps,
  RuleGroupProps,
  RuleProps,
  Schema,
  SimpleQueryBuilderProps,
  SimpleQueryBuilderPropsIC,
  Translations,
  UndoRedoActionsProps,
  ValueEditorProps,
} from './index.js';

declare function assertType<T>(value: T): void;

// #region QueryBuilderProps — independent combinators
type ICProps = QueryBuilderProps<RuleGroupTypeIC, FullField, FullOperator, FullCombinator>;

declare const icProps: ICProps;

assertType<RuleGroupTypeIC | undefined>(icProps.query);
assertType<RuleGroupTypeIC | undefined>(icProps.defaultQuery);
// @ts-expect-error no external manager; the query lives in runes
assertType<unknown>(icProps.manager);
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
// Every entry is present after finalization, including `undoRedoActions`; `null` means
// "render nothing".
assertType<Control<UndoRedoActionsProps> | null>(controls.undoRedoActions);
assertType<Control<ValueEditorProps<FullField, string>> | null>(controls.valueEditor);
// A control is a component or a wrapped snippet, never a bare snippet: the two are
// indistinguishable at runtime.
declare const actionComponent: Component<ActionProps>;
declare const actionSnippet: Snippet<[ActionProps]>;
assertType<ControlsProp<FullField, string>['actionElement']>(actionComponent);
assertType<ControlsProp<FullField, string>['actionElement']>({ snippet: actionSnippet });
assertType<ControlsProp<FullField, string>['actionElement']>(null);
// @ts-expect-error a bare snippet is not a control
assertType<ControlsProp<FullField, string>['actionElement']>(actionSnippet);
// @ts-expect-error a bare snippet is not a control
assertType<Controls<FullField, string>['notToggle']>(undefined as unknown as Snippet<[never]>);

declare const controlsProp: ControlsProp<FullField, string>;
// Entries are optional on the way in.
assertType<null | undefined | NonNullable<typeof controls.valueEditor>>(controlsProp.valueEditor);
// @ts-expect-error `dragHandle` is not a control element in this package
assertType<unknown>(controlsProp.dragHandle);
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
assertType<() => RuleGroupTypeAny>(schema.getQuery);
assertType<boolean>(schema.history.canUndo);
// @ts-expect-error no `QueryManager`; the query lives in runes
assertType<unknown>(schema.manager);
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

// #region Snippet props
// One name per control: the top-level prop takes a snippet, `controls` takes a component.
declare const snippets: ControlSnippetProps<FullField, string>;
assertType<Snippet<[ValueEditorProps<FullField, string>]> | undefined>(snippets.valueEditor);
assertType<Snippet<[ActionProps]> | undefined>(snippets.actionElement);
// @ts-expect-error there is no `dragHandle` control, so there is no snippet for it either
assertType<unknown>(snippets.dragHandle);
// Snippet props are top-level props of `QueryBuilder`, which is what makes
// `{#snippet rule(props)}` work as a direct child.
assertType<Snippet<[RuleProps]> | undefined>(stdProps.rule);
// #endregion

// #region Convenience aliases
assertType<SimpleQueryBuilderProps>(stdProps);
assertType<SimpleQueryBuilderPropsIC>(icProps);
// @ts-expect-error the aliases are not interchangeable
assertType<SimpleQueryBuilderPropsIC>(stdProps);
// #endregion
