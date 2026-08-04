# Svelte Query Builder Development Guide

**COMMUNICATION STYLE**: Be aggressively concise. Prioritize brevity over grammar. Examples:

- "Build failed" not "The build has failed"
- "Fixed type error" not "I have fixed the type error"
- "Run tests" not "I will run the tests for you"

This guide covers `svelte-querybuilder` development: code style, workflow, and other patterns.

## Project Overview

Svelte 5 port of [React Query Builder](https://react-querybuilder.js.org). Bun workspace monorepo:

- **Main package**: `packages/svelte-querybuilder` - Svelte 5 components + types
- **Logic layer**: `@react-querybuilder/core` (npm dependency) - query manipulation, parsers, formatters, defaults, i18n strings. **Not vendored.** Re-exported from the barrel so consumers never need a direct core dependency.
- **Examples**: `examples/*` (workspace glob; may be empty)

The repo is in early development. Nothing published yet.

### Relationship to RQB core

Core owns the logic; this package owns the UI. Before writing an algorithm, check whether core already exports it (`add`, `remove`, `update`, `move`, `formatQuery`, `parseSQL`, `defaultOperators`, `transformQuery`, etc.). Port React _behavior_, not React _implementation_. Hooks, memoization, context, and Redux are React solutions to React problems — use Svelte 5 runes instead.

### Non-goals (see README)

Drag-and-drop, UI-framework packages (Ant/Bootstrap/MUI/etc.), `expr`/`datetime` integrations, async option lists, a Redux store or `qbId` registry, deprecated-prop fallbacks from the React package. Don't add these speculatively.

## Development Workflow

### Setup

```bash
bun install
bun run build
```

### Commands

Run from repo root unless noted.

**Quality:**

- `bun run test` - Vitest (jsdom + `@testing-library/svelte`)
- `bun run test:watch` - Watch mode
- `bun run test:coverage` - Coverage (threshold: 80% lines, `src/lib/**`)
- `bun run test:ssr` - SSR smoke test
- `bun run check` - `svelte-check` (types + Svelte diagnostics; this repo's `typecheck`)
- `bun lint` - oxlint
- `bun fmt` / `bun fmt:check` - oxfmt (run `bun fmt` after changes)

**Build:**

- `bun run build` - `svelte-package` into `dist`, then compile SCSS

Before submitting a PR, run the CI sequence: `bun run build && bun run check && bun lint && bun fmt:check && bun run test:coverage && bun run test:ssr`.

## Code Style

### Structure

```
packages/svelte-querybuilder/src/lib/
├── *.svelte           # Components (PascalCase.svelte)
├── types/             # TypeScript defs
├── utils/             # Svelte-specific utilities (camelCase.ts)
├── styles/            # SCSS (_svelte.scss layered over core's partials)
└── index.ts           # Barrel: components, types, and `export * from '@react-querybuilder/core'`
```

### Naming

- **Components**: PascalCase (`QueryBuilder.svelte`, `RuleGroup.svelte`)
- **Utilities**: camelCase (`generateId.ts`)
- **Types**: camelCase files (`basic.ts`)
- **Tests**: `*.test.ts` colocated next to the source

### Svelte 5

Runes only. No Svelte 4 idioms — no `export let`, no `$:`, no stores for component state, no `createEventDispatcher`.

```svelte
<script lang="ts">
  import type { QueryBuilderProps } from './types';

  let { fields, query = $bindable(), onQueryChange }: QueryBuilderProps = $props();

  const operators = $derived(getOperators(field));
</script>
```

- `$props()` with a typed destructure; `$bindable()` for two-way `query`
- `$derived` / `$derived.by` instead of `useMemo`. Fine-grained reactivity means manual memoization is almost never needed — don't port React's memoization.
- `$state` for local mutable state; `$effect` only as a last resort (prefer `$derived`)
- Callback props (`onQueryChange`), not events
- `{#snippet}` / `{@render}` for slot-like customization instead of `controlElements` component maps where it reads better; keep an escape hatch for passing custom components
- `setContext`/`getContext` for cross-tree config instead of prop drilling — but context is set once at init, so pass a getter or a `$state` object if the value must stay reactive

### TypeScript

- Generics with constraints, mirroring RQB's `RG extends RuleGroupTypeAny`, `F extends FullField`, etc.
- Always `import type` for type-only imports
- Re-export core types from the barrel rather than redefining them

### Immutability

Query updates are immutable and path-based (`[0, 1, 2]`), same as RQB. Route them through core's `add`/`remove`/`update`/`move` and assign the result. Never mutate a query node in place, even though runes would make it "work" — consumers hold references to the previous query.

### Styling

- SCSS with core's class names (`.queryBuilder-rule`, etc.) — the DOM should be class-compatible with RQB so existing stylesheets and custom themes port over
- `src/lib/styles/_svelte.scss` holds package-local overrides; `build:css` copies core's `.scss` partials in before compiling
- No CSS-in-JS, no scoped styles that break consumer overrides

### Formatting

oxfmt config: 100 cols, 2 spaces, single quotes, semicolons, ES5 trailing commas, `arrowParens: avoid`, `bracketSameLine: true`, sorted imports. Don't hand-format; run `bun fmt`.

## Bun APIs

This project runs on Bun. Prefer Bun-native APIs over Node.js equivalents in scripts and tooling:

- `Bun.file(path).text()` / `.json()` instead of `fs.readFileSync`
- `Bun.write(path, content)` instead of `fs.writeFileSync`
- `Bun.spawnSync(...)` / `Bun.spawn(...)` instead of `child_process.execSync` / `exec`

Only fall back to `node:*` APIs when no Bun equivalent exists. Library code under `src/lib` must stay runtime-agnostic — no Bun or Node APIs there.

## Testing

- Vitest + `@testing-library/svelte` + `@testing-library/jest-dom` + `vitest-axe`
- jsdom environment, globals enabled, setup in `packages/svelte-querybuilder/vitest-setup.ts`
- Test files: `ComponentName.test.ts`, colocated
- Describe blocks: component/function name. Test cases: descriptive behavior.
- Test behavior through the DOM and `userEvent`, not internal state
- Keep `data-testid` attributes matching RQB's so ported tests stay recognizable
- Coverage threshold is 80% lines and should trend up, not down
- SSR must not break: components have to render without `window` (`bun run test:ssr`)

## Porting from React Query Builder

The React source is the spec. When porting a component:

1. Read the RQB source and its tests
2. Keep prop names, class names, `data-testid`s, and DOM structure identical unless there's a reason not to
3. Translate hooks to runes; drop memoization
4. Port the tests, then the component
5. Note intentional divergences in a comment and in the changelog

Document user-visible changes in `CHANGELOG.md` under `## [Unreleased]` (Keep a Changelog format, SemVer).

## Accessibility

- ARIA attributes and label associations preserved from RQB
- Keyboard navigation for all controls
- `vitest-axe` assertions on rendered output
- `data-testid` attributes on every control element

## Internationalization (i18n)

Use core's `Translations` type and default strings. Svelte-side: allow snippets as well as strings for translatable labels.

## Pitfalls

1. Reimplementing logic that `@react-querybuilder/core` already exports
2. Svelte 4 idioms (`export let`, `$:`, `createEventDispatcher`)
3. Porting React memoization into runes
4. Mutating query objects in place
5. Missing `import type`
6. `$effect` where `$derived` would do
7. Non-reactive values captured in `setContext`
8. Direct DOM manipulation
9. Breaking SSR
10. Diverging from RQB class names / `data-testid`s without a reason
11. Missing tests or accessibility coverage
12. Editing `packages/svelte-querybuilder/dist` (generated by `svelte-package`)

## Quick Reference

**Commands:**

- `bun run build` - Package + CSS
- `bun run check` - svelte-check
- `bun run test` - Tests
- `bun fmt` - Format
- `bun run test:coverage` - Coverage

**Directories:**

- `packages/svelte-querybuilder/src/lib/` - Library source (the only published code)
- `packages/svelte-querybuilder/dist/` - Generated; never edit
- `examples/` - Demos and starter templates
