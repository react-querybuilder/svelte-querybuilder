# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Initial development. Nothing published yet.

### Added

- Public type definitions (`src/lib/types`), ported from `react-querybuilder`'s `types/props.ts` and re-exported from the package barrel: component props, `Schema`, `Controls`/ `ControlElementsProp`, and `Translations`.

### Changed (divergences from React Query Builder)

- `ReactNode` labels become `LabelNode = Snippet | string`; `ComponentType<P>` becomes Svelte's `Component<P>`.
- `Schema` drops `qbId` and `dispatchQuery` and gains `manager: QueryManager`. `QueryBuilderProps` drops `qbId` and gains an optional `manager` prop for external control.
- Removed: `DragHandleProps`, `UseRuleDnD`, `UseRuleGroupDnD`, the `dragHandle` and `ruleGroupHeaderElements`/`ruleGroupBodyElements` control elements, the `enableDragAndDrop`, `preserveQueryStateOnUnmount`, and `independentCombinators` props, the deprecated `ActionWithRulesProps`/`ActionWithRulesAndAddersProps` aliases, and the deprecated per-prop fallbacks on `RuleProps` and `RuleGroupProps`.
- `Controls['undoRedoActions']` is non-nullable; undo/redo is backed by `QueryManager` history rather than a separate entry point.
