# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Initial development. Nothing published yet.

### Added

- Components (`src/lib/components`): `QueryBuilder`, `RuleGroup`, `Rule`, `ValueEditor`, `ValueSelector`, and `ActionElement`, plus the `defaultControlElements` map. The DOM structure—tag names, document order, `data-testid`, `data-path`, and `class` attributes—matches React Query Builder. `QueryBuilder` accepts `bind:query` as well as the `query`/`defaultQuery`/`onQueryChange` props, and a `manager` prop for external control.
- Reactive layer (`src/lib/reactive`): `createQueryBuilderState` (query state, schema, and derived config, driven by a `QueryManager`), `createActions` (the `QueryActions` shape backed by manager mutators), `createRuleContext`/`createRuleGroupContext`, `createValueEditorReset` (the value-editor reset effect), and the Svelte context helpers `setQueryBuilderContext`/`getQueryBuilderContext`.
- Public type definitions (`src/lib/types`), ported from `react-querybuilder`'s `types/props.ts` and re-exported from the package barrel: component props, `Schema`, `Controls`/ `ControlElementsProp`, and `Translations`.

### Changed (divergences from React Query Builder)

- `ReactNode` labels become `LabelNode = Snippet | string`; `ComponentType<P>` becomes Svelte's `Component<P>`.
- `Schema` drops `qbId` and `dispatchQuery` and gains `manager: QueryManager`. `QueryBuilderProps` drops `qbId` and gains an optional `manager` prop for external control.
- Removed: `DragHandleProps`, `UseRuleDnD`, `UseRuleGroupDnD`, the `dragHandle` and `ruleGroupHeaderElements`/`ruleGroupBodyElements` control elements, the `enableDragAndDrop`, `preserveQueryStateOnUnmount`, and `independentCombinators` props, the deprecated `ActionWithRulesProps`/`ActionWithRulesAndAddersProps` aliases, and the deprecated per-prop fallbacks on `RuleProps` and `RuleGroupProps`.
- `Controls['undoRedoActions']` is non-nullable; undo/redo is backed by `QueryManager` history rather than a separate entry point.
- Query state lives in a `QueryManager` instead of a Redux store, and the query is held in `$state.raw` (queries are immutable and replaced wholesale). Structural manager options (`fields`, `operators`, `combinators`, boolean flags) are read once, when the manager is constructed; function props are forwarded through closures and stay live.
- Controlled mode guards against feedback loops with a reference check followed by a structural signature comparison, so a parent that stores the query in `$state` (handing back a proxy of the object the query builder just emitted) does not loop. Reactive proxies are snapshotted before they reach the manager, which deep-freezes whatever it is given.
- `RuleGroup` renders its header and body inline instead of delegating to `ruleGroupHeaderElements`/`ruleGroupBodyElements`. Nested rules and groups are rendered through `schema.controls`, so a replacement `rule`/`ruleGroup` component applies at every level.
- `Rule` resolves its configuration with core's `deriveRuleContext` over `schema`, rather than `QueryManager.getRuleContext(path)`, so a replacement `rule` component can render a rule that is not in the manager's query.
- No drag handle and no `data-dragmonitorid`/`data-dropmonitorid` attributes; drag-and-drop is a non-goal.

### Not yet implemented

- `NotToggle`, `ShiftActions`, `InlineCombinator`, `MatchModeEditor`, and `UndoRedoActions` render nothing. Each is gated behind a flag that defaults to `false`, except `inlineCombinator`, which additionally covers independent-combinator queries. Rules whose field supports match modes render no subquery.
