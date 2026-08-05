# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Initial development. Nothing published yet.

### Added

- Components (`src/lib/components`): `QueryBuilder`, `RuleGroup`, `Rule`, `ValueEditor`, `ValueSelector`, and `ActionElement`, plus the `defaultControlElements` map. The DOM structure—tag names, document order, `data-testid`, `data-path`, and `class` attributes—matches React Query Builder. `QueryBuilder` accepts `bind:query` as well as the `query`/`defaultQuery`/`onQueryChange` props, and a `manager` prop for external control.
- Remaining components: `NotToggle`, `ShiftActions`, `InlineCombinator`, `MatchModeEditor`, and `UndoRedoActions`, all wired into `defaultControlElements`. With them, feature coverage is complete for independent combinators, `showCombinatorsBetweenRules`, `showNotToggle`, `showShiftActions`, `showCloneButtons`, `showLockButtons`, `showMuteButtons`, match modes and subqueries, the `"parameter"` value source, `validator`/`validationMap`, `accessibleDescriptionGenerator`, `disabled`/`disabledPaths`, `suppressStandardClassnames`, `maxLevels`, and undo/redo.
- Internal components `RuleComponents`, `RuleGroupHeader`, `RuleGroupBody`, and `RuleSubQuery`, along with `createRuleParts`/`createRuleGroupParts` (the equivalents of React's `useRule`/`useRuleGroup`, taking a props _getter_). The split mirrors upstream and is what makes rule subqueries possible.
- Reactive layer (`src/lib/reactive`): `createQueryBuilderState` (query state, schema, and derived config, driven by a `QueryManager`), `createActions` (the `QueryActions` shape backed by manager mutators), `createRuleContext`/`createRuleGroupContext`, `createValueEditorReset` (the value-editor reset effect), and the Svelte context helpers `setQueryBuilderContext`/`getQueryBuilderContext`.
- Public type definitions (`src/lib/types`), ported from `react-querybuilder`'s `types/props.ts` and re-exported from the package barrel: component props, `Schema`, `Controls`/ `ControlElementsProp`, and `Translations`.
- `examples/demo` — a Vite + Svelte app aliased to library source, exercising nested groups, independent combinators, every display flag, undo/redo, and live `formatQuery` output in four formats.
- `examples/sveltekit` — a SvelteKit app that server-renders a nested independent-combinator query and runs `formatQuery` in a server `load`. Its `ssr-smoke-test.ts` boots a preview server and asserts the query builder tree is present in the server response; wired as the repo's `test:ssr` gate in CI.
- Documentation: `docs/styling.md` (stylesheets, CSS custom properties, class names) and `docs/differences-from-react-querybuilder.md`, plus an expanded `README.md`.
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
- Query state lives in a `QueryManager` instead of a Redux store, and the query is held in `$state.raw` (queries are immutable and replaced wholesale). Structural manager options (`fields`, `operators`, `combinators`, boolean flags) are read once, when the manager is constructed; function props are forwarded through closures and stay live.
- Controlled mode guards against feedback loops with a reference check followed by a structural signature comparison, so a parent that stores the query in `$state` (handing back a proxy of the object the query builder just emitted) does not loop. Reactive proxies are snapshotted before they reach the manager, which deep-freezes whatever it is given.
- `RuleGroup` renders its header and body inline instead of delegating to `ruleGroupHeaderElements`/`ruleGroupBodyElements`. Nested rules and groups are rendered through `schema.controls`, so a replacement `rule`/`ruleGroup` component applies at every level.
- `Rule` resolves its configuration with core's `deriveRuleContext` over `schema`, rather than `QueryManager.getRuleContext(path)`, so a replacement `rule` component can render a rule that is not in the manager's query.
- No drag handle and no `data-dragmonitorid`/`data-dropmonitorid` attributes; drag-and-drop is a non-goal.

- `docs/customization.md` — translations, snippets, `controlElements`, resolution order, context, replacement components, and external control via `QueryManager`.

### Known limitations

- Axe's best-practice rule `label-title-only` fires on every selector and text editor: React Query Builder labels them with `title` alone, and full DOM parity is a locked decision for this port. It is not a WCAG failure (`title` does produce an accessible name), and the a11y suite asserts it is the _only_ best-practice violation, so any other regression still fails. Supply a labeled control through `controlElements` or a snippet if you need a visible label.
