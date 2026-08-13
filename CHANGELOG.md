# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Query state is now owned entirely by Svelte runes. `QueryManager` is gone from this package: core's pure functions (`add`/`remove`/`update`/`move`, `createQueryActions`, `prepareOptionList`, `deriveRuleContext`, `shouldCoalesce`) supply the logic, and the reactive graph lives in `$state`/`$derived`. `createQueryBuilderState` contains no `$effect` at all, and no longer relies on deep-compare, live closures, a config-version counter, subscription mirroring, or try/catch around immer's freeze.

Control elements are now composed the Svelte way. Each of the 24 control names is a top-level snippet prop, so `{#snippet valueEditor(props)}` works as a direct child of `<QueryBuilder>`, and the internal component-ABI trick that used to make snippets and components interchangeable is gone.

### Removed

- **Breaking:** the `controlElements` prop, replaced by `controls` (see below).
- **Breaking:** `ControlSnippets` and the 24 `${key}Snippet` props it generated. There is now one name per control.
- `snippetToComponent` and `SnippetHost`, which fabricated a component from a snippet by invoking a compiled `.svelte` module through Svelte's undocumented `(anchor | payload, props)` calling convention, plus the `WeakMap` that kept the fabricated components identity-stable. Nothing in the package relies on Svelte internals now.
- `nullComponent`. A `null` control short-circuits in the renderer instead of rendering an empty component.
- **Breaking:** the `manager` prop and `schema.manager`. External `QueryManager` control was speculative, unused, and the one thing runes cannot own. Hold the query yourself and use `bind:query`, or `query` + `onQueryChange`.
- **Breaking:** `enableMountQueryChange`. Its behavior is now derived from first principles — see below.
- `createRuleContext` and `createRuleGroupContext`, along with the `Derived<T>` (`{ readonly current: T }`) wrapper type. `createRuleParts`/`createRuleGroupParts` are the supported path and return getters directly.
- `createActions`, superseded by core's `createQueryActions`.

### Added

- Top-level snippet props for every control: `valueEditor`, `removeRuleAction`, `ruleGroup`, `actionElement`, `valueSelector`, and so on. A snippet declared inside a component's tags only becomes a prop when the name is top-level, which is what makes the idiomatic form reachable.
- `controls`, the bulk object form, for configuration assembled programmatically. It accepts components, `null`, and snippets wrapped as `{ snippet }`.

### Changed

- **Breaking:** control elements are typed `Control<P> = Component<P> | { snippet: Snippet<[P]> }`, or `null`. Snippets and components are both plain functions at runtime with no reliable way to tell them apart, so a snippet used as a control carries a wrapper object; the top-level snippet props wrap automatically. `ControlElementsProp` is now `ControlsProp`, and `ControlPropsMap` is the single source of truth for control names and their prop types.
- **Breaking:** `Controls` entries are uniformly nullable — including `actionElement`, `valueSelector`, `rule`, and `ruleGroup` — with `null` meaning "render nothing". Every key is always present after resolution.
- **Breaking:** `selectorComponent`, `numericEditorComponent`, and `InlineCombinatorProps.component` accept a `Control`, so a `valueSelector` supplied as a snippet applies inside `ValueEditor` and `MatchModeEditor` too.
- **Breaking:** `mergeControlElements` is now `mergeControls(controls, snippets, contextControls, defaults)`.
- A query builder publishes its _resolved_ controls through context, so a nested (subquery) builder inherits what the outer one resolved and overrides it per key with its own props.
- **Breaking:** `schema.manager` is replaced by `schema.history` — `canUndo`, `canRedo`, `undo`, `redo`, `clear`. Backed by getters, so reads stay reactive without dependency pokes.
- **Breaking:** the `skipHook` option is renamed `skipValueReset` on `MatchModeEditor` and the value-editor reset. It suppresses the value reset, which is what the name now says.
- **Breaking:** `shiftActions` and `undoRedoActions` no longer receive the `actionElement` bulk control override, despite the plural suffix. Bulk classification now uses core's explicit `controlKind` map instead of matching on key suffixes, so a control named `somethingSelector` can no longer silently inherit `valueSelector`.
- `onQueryChange` fires once during initialization if and only if the initial query was seeded or normalized by the component — no query supplied, or one supplied without `id`s. A query handed over ready to use never triggers it. This is what `enableMountQueryChange` used to control, minus the flag.
- The `query` prop is documented as an input rather than the authority: it wins whenever it changes, and local edits stand in between. Note that a `query` prop rebuilt as a fresh object on every read is indistinguishable from a deliberate change and will revert every edit; pass a stable reference.
- Option lists are `$derived(prepareOptionList(...))` rather than read back off a manager, and structural options (`fields`, `operators`, `combinators`, `translations`, `maxLevels`, `disabled`, `validator`, `idGenerator`, the `autoSelect*` flags) are re-derived from props instead of pushed into a mutable instance via `reconfigure`. Changing them mid-session still preserves the query and the undo/redo history.
- Undo/redo history is two `$state.raw` stacks with coalescing delegated to core's `shouldCoalesce`, so the coalescing rule cannot drift from core's.
- `QueryBuilder` publishes context as `setQueryBuilderContext(() => state.context)` rather than an `Object.defineProperty` reflection loop, so the key set is no longer snapshotted at initialization. `getQueryBuilderContext` returns a getter.
- Minimum `@react-querybuilder/core` is now 8.23.0, for the query-tool `freeze` opt-out (deep-freezing a Svelte `$state` proxy throws), `shouldCoalesce`, `controlKeys`/`controlKind`, and `DefaultFieldProp`/`DefaultOperatorProp`.

### Fixed

- Mounting a query with rules whose `value` no longer matches their `operator` — the ones for which core's `getValueEditorReset` returns `reset: true` — is roughly 40x faster. Each such rule commits a query change during mount, and every commit was re-dirtying every prop of every control in the tree, so the cost grew quadratically in the number of reset-eligible rules (~1s for a two-rule case in an eight-rule tree). Control prop bags are now getter-backed objects built once, rather than `$derived` object literals rebuilt per commit: `Control` forwards them through `{...props}`, and Svelte's `spread_props` resolves one key at a time, so each of a control's props subscribes to only its own sources instead of to the union of all of them. Interactive editing was never affected.

## [0.1.1] - 2026-08-05

### Fixed

- README.md included when publishing.

## [0.1.0] - 2026-08-05

First release. A Svelte 5 port of [React Query Builder](https://react-querybuilder.js.org), built on `@react-querybuilder/core`.

### Added

- Components (`src/lib/components`): `QueryBuilder`, `RuleGroup`, `Rule`, `ValueEditor`, `ValueSelector`, and `ActionElement`, plus the `defaultControlElements` map. The DOM structure—tag names, document order, `data-testid`, `data-path`, and `class` attributes—matches React Query Builder. `QueryBuilder` accepts `bind:query` as well as the `query`/`defaultQuery`/`onQueryChange` props, and a `manager` prop for external control.
- Remaining components: `NotToggle`, `ShiftActions`, `InlineCombinator`, `MatchModeEditor`, and `UndoRedoActions`, all wired into `defaultControlElements`. With them, feature coverage is complete for independent combinators, `showCombinatorsBetweenRules`, `showNotToggle`, `showShiftActions`, `showCloneButtons`, `showLockButtons`, `showMuteButtons`, match modes and subqueries, the `"parameter"` value source, `validator`/`validationMap`, `accessibleDescriptionGenerator`, `disabled`/`disabledPaths`, `suppressStandardClassnames`, `maxLevels`, and undo/redo.
- Internal components `RuleComponents`, `RuleGroupHeader`, `RuleGroupBody`, and `RuleSubQuery`, along with `createRuleParts`/`createRuleGroupParts` (the equivalents of React's `useRule`/`useRuleGroup`, taking a props _getter_). The split mirrors upstream and is what makes rule subqueries possible.
- Reactive layer (`src/lib/reactive`): `createQueryBuilderState` (query state, schema, and derived config, driven by a `QueryManager`), `createActions` (the `QueryActions` shape backed by manager mutators), `createRuleContext`/`createRuleGroupContext`, `createValueEditorReset` (the value-editor reset effect), and the Svelte context helpers `setQueryBuilderContext`/`getQueryBuilderContext`.
- Public type definitions (`src/lib/types`), ported from `react-querybuilder`'s `types/props.ts` and re-exported from the package barrel: component props, `Schema`, `Controls`/ `ControlElementsProp`, and `Translations`.
- `examples/demo` — a Vite + Svelte app aliased to library source, exercising nested groups, independent combinators, every display flag, undo/redo, and live `formatQuery` output in four formats.
- `examples/sveltekit` — a SvelteKit app that server-renders a nested independent-combinator query and runs `formatQuery` in a server `load`. Its `ssr-smoke-test.ts` boots a preview server and asserts the query builder tree is present in the server response; wired as the repo's `test:ssr` gate in CI.
- Documentation: `docs/styling.md` (stylesheets, CSS custom properties, class names) and `docs/differences-from-react-querybuilder.md`, plus an expanded `README.md`.
- `docs/customization.md` — translations, snippets, `controlElements`, resolution order, context, replacement components, and external control via `QueryManager`.
- Snippet props for every component customization point: for each key `x` of `controlElements` there is an `xSnippet` prop taking `Snippet<[props]>`, including the `actionElementSnippet`/`valueSelectorSnippet` bulk overrides. Snippets take precedence over the `controlElements` entry at the same level; the full order is keyed snippet, keyed component, bulk snippet, bulk component, tried across props, then context, then defaults. Adapted to the `Controls` shape by `snippetToComponent`, which caches by snippet identity so a config change never remounts the tree.
- `ControlSnippets` type, and the convenience aliases `SimpleQueryBuilderProps`, `SimpleQueryBuilderPropsIC`, `SimpleRuleProps`, and `SimpleRuleGroupProps`. `QueryBuilder`, `RuleGroup`, and `Rule` are now generic components (`generics=`), so `bind:query` infers `RuleGroupType` vs `RuleGroupTypeIC` from the query.
- `src/lib/internal/Label.svelte`, which renders a `LabelNode` (`Snippet | string`) with no wrapper element and no whitespace. Every label render site goes through it.
- Accessibility suite (`src/lib/components/a11y.test.ts`): `vitest-axe` over all seven conformance scenarios plus an independent-combinator tree with every control enabled, asserting zero WCAG 2.0/2.1 A and AA violations, and keyboard tests covering tab order through a rule row, `Enter`/`Space` activation, and the not-toggle label association.
- Conformance harness (`packages/svelte-querybuilder/test/conformance`, run with `bun run conformance`). Fixtures are downloaded from a pinned `react-querybuilder` release, checksum-verified, and asserted against: 49 full-DOM class-surface cases, 49 accessible-description cases, 58 replayed mutation sequences, and a `formatQuery` → `parseSQL` → `formatQuery` round trip.
- Package-exports gate (`bun run check:exports`, wired into CI). Runs `@arethetypeswrong/cli` against a packed tarball, plus `scripts/check-dist-specifiers.ts`, which asserts every relative specifier in `dist` carries an extension and points at a file that exists. `attw` alone can't cover this: it flags `.svelte` imports in `.d.ts` files as unresolvable (TypeScript has no built-in `.svelte` resolver), so that rule has to be ignored wholesale.

### Fixed

- Relative imports in the published output now carry explicit file extensions, so the package resolves under Node16/NodeNext ESM. `svelte-package` copies specifiers through verbatim, so the extensionless and directory imports in `src/lib` (`./components`, `./reactive`, `./types`, and 50-odd others) reached `dist` unchanged and failed with `ERR_UNSUPPORTED_DIR_IMPORT`. Only bundler-based consumers were unaffected, which is why the test suite and SSR gate never caught it. Note that a `*.svelte.ts` rune module is imported as `*.svelte.js`, distinct from a `*.svelte` component import.
- The `./dist/*` export wildcard is narrowed to `./dist/*.css` and `./dist/*.scss`. It existed only to serve stylesheets, but exposed every internal module as public API. The documented `svelte-querybuilder/dist/query-builder.css` and `.scss` specifiers are unchanged; deep imports of internal JavaScript are now blocked.
- `types` is listed first in the `"."` export condition map, ahead of `svelte` and `default`, as TypeScript requires for reliable resolution.

### Changed (divergences from React Query Builder)

- `ReactNode` labels become `LabelNode = Snippet | string`; `ComponentType<P>` becomes Svelte's `Component<P>`; click handlers take DOM `MouseEvent`s rather than React synthetic events.
- `Schema` drops `qbId` and `dispatchQuery` and gains `manager: QueryManager`. `QueryBuilderProps` drops `qbId` and gains an optional `manager` prop for external control.
- Removed: `DragHandleProps`, `UseRuleDnD`, `UseRuleGroupDnD`, the `dragHandle` and `ruleGroupHeaderElements`/`ruleGroupBodyElements` control elements, the `enableDragAndDrop`, `preserveQueryStateOnUnmount`, and `independentCombinators` props, the deprecated `ActionWithRulesProps`/`ActionWithRulesAndAddersProps` aliases, and the deprecated per-prop fallbacks on `RuleProps` and `RuleGroupProps`.
- `Controls['undoRedoActions']` is non-nullable; undo/redo is backed by `QueryManager` history rather than a separate entry point. `UndoRedoActions` reads `canUndo`/`canRedo` off `schema.manager`; there is no `useQueryBuilderHistory`, no `qbId`, and no `react-querybuilder/history` equivalent.
- `createQueryBuilderState` clears manager history after seeding the initial query, so undo is disabled on first paint.
- Query state lives in a `QueryManager` instead of a Redux store, and the query is held in `$state.raw` (queries are immutable and replaced wholesale). Structural manager options are applied to the manager in place with `reconfigure` when their props change; function props are forwarded through closures and stay live.
- Controlled mode guards against feedback loops with a reference check followed by a structural signature comparison, so a parent that stores the query in `$state` (handing back a proxy of the object the query builder just emitted) does not loop. Reactive proxies are snapshotted before they reach the manager, which deep-freezes whatever it is given.
- `RuleGroup` renders its header and body inline instead of delegating to `ruleGroupHeaderElements`/`ruleGroupBodyElements`. Nested rules and groups are rendered through `schema.controls`, so a replacement `rule`/`ruleGroup` component applies at every level.
- `Rule` resolves its configuration with core's `deriveRuleContext` over `schema`, rather than `QueryManager.getRuleContext(path)`, so a replacement `rule` component can render a rule that is not in the manager's query.
- No drag handle and no `data-dragmonitorid`/`data-dropmonitorid` attributes; drag-and-drop is a non-goal.

### Known limitations

- Axe's best-practice rule `label-title-only` fires on every selector and text editor: React Query Builder labels them with `title` alone, and full DOM parity is a locked decision for this port. It is not a WCAG failure (`title` does produce an accessible name), and the a11y suite asserts it is the _only_ best-practice violation, so any other regression still fails. Supply a labeled control through `controlElements` or a snippet if you need a visible label.

[unreleased]: https://github.com/react-querybuilder/svelte-querybuilder/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/react-querybuilder/svelte-querybuilder/releases/tag/v0.1.1
[0.1.0]: https://github.com/react-querybuilder/svelte-querybuilder/releases/tag/v0.1.0
