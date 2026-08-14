# Svelte Query Builder Development Guide

**COMMUNICATION STYLE**: Be aggressively concise. Prioritize brevity over grammar. Examples:

- "Build failed" not "The build has failed"
- "Fixed type error" not "I have fixed the type error"
- "Run tests" not "I will run the tests for you"

This guide covers `svelte-querybuilder` development: code style, workflow, and other patterns.

## Project Overview

A Svelte 5 library that shares its logic layer with [React Query Builder](https://react-querybuilder.js.org) — not a transliteration of it. Behavior and rendered DOM are held to RQB; the component API is designed for Svelte. Bun workspace monorepo:

- **Main package**: `packages/svelte-querybuilder` - Svelte 5 components + types, plus the development playground under `src/routes`
- **Logic layer**: `@react-querybuilder/core` (npm dependency) - query manipulation, parsers, formatters, defaults, i18n strings. **Not vendored.** Re-exported from the barrel so consumers never need a direct core dependency.
- **Examples**: `examples/*` (workspace glob) - currently just `sveltekit`, which doubles as the SSR gate

See `CHANGELOG.md` for release history.

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
- `bun run check:exports` - `attw` on a packed tarball + `dist` specifier lint (needs a build first)
- `bun lint` - oxlint
- `bun fmt` / `bun fmt:check` - oxfmt (run `bun fmt` after changes)
- `bun run conformance` - Fetches the RQB fixture set and runs the conformance suites

**Build and run:**

- `bun run build` - `svelte-package` into `dist`, then compile SCSS
- `bun run dev` - Serves the playground at `packages/svelte-querybuilder/src/routes` against library source

Before submitting a PR, run the CI sequence: `bun run check:all`.

## Code Style

### Structure

```
packages/svelte-querybuilder/
├── src/lib/           # The only published code
│   ├── *.svelte       # Components (PascalCase.svelte)
│   ├── types/         # TypeScript defs
│   ├── utils/         # Svelte-specific utilities (camelCase.ts)
│   ├── styles/        # SCSS (_svelte.scss layered over core's partials)
│   └── index.ts       # Barrel: components, types, `export * from '@react-querybuilder/core'`
├── src/routes/        # SvelteKit dev playground; never packaged
└── test/conformance/  # Fixture-driven parity suites (fixtures are downloaded, not generated)
```

The package is a SvelteKit project so that `src/routes` can exist, but Kit is a development
convenience only: `svelte-package` reads `src/lib` and nothing else. `vite.config.ts` serves the
playground; the unit suite has its own `vitest.config.ts` on the bare `svelte()` plugin, because
`sveltekit()` resolves its project from the working directory and Vitest runs the package from
the monorepo root.

### Naming

- **Components**: PascalCase (`QueryBuilder.svelte`, `RuleGroup.svelte`)
- **Utilities**: camelCase (`generateId.ts`)
- **Types**: camelCase files (`basic.ts`)
- **Tests**: `*.test.ts` colocated next to the source

### Svelte 5

Runes only. No Svelte 4 idioms — no `export let`, no `$:`, no stores for component state, no `createEventDispatcher`.

```svelte
<script lang="ts">
  import type { QueryBuilderProps } from './types/index.js';

  let { fields, query = $bindable(), onQueryChange }: QueryBuilderProps = $props();

  const operators = $derived(getOperators(field));
</script>
```

- `$props()` with a typed destructure; `$bindable()` for two-way `query`
- `$derived` / `$derived.by` instead of `useMemo`. Fine-grained reactivity means manual memoization is almost never needed — don't port React's memoization.
- `$state` for local mutable state; `$effect` only as a last resort (prefer `$derived`)
- Callback props (`onQueryChange`), not events
- `{#snippet}` / `{@render}` for slot-like customization: each control is a top-level snippet prop, with the `controls` object as the escape hatch for passing components. Snippets and components are indistinguishable at runtime, so a snippet used as a control is wrapped as `{ snippet }` (see `internal/Control.svelte`) — never invoke a compiled component or snippet by hand
- `setContext`/`getContext` for cross-tree config instead of prop drilling — but context is set once at init, so pass a getter or a `$state` object if the value must stay reactive

#### Destructuring `$props()`

Two conventions, and the choice is not stylistic:

- **Leaf controls destructure**: `const { value, handleOnChange }: ValueSelectorProps = $props();`. They read their props during render, so the destructured snapshot is what the template already tracks.
- **Forwarding components don't**: `const props: RuleProps = $props();`, then `props.schema` at the point of use. Destructuring reads every prop eagerly, at init; components that hand props onward (or build getter-backed prop bags — see `internal/lazyProps.ts`) must read them late so each downstream consumer subscribes only to what it actually touches.

Don't name a local `props` in a component that also destructures `$props()` — svelte2tsx generates a conflicting binding and `svelte-check` fails with "`$props` used before its declaration." Name it for what it holds (`ruleProps`).

### TypeScript

- Generics with constraints, mirroring RQB's `RG extends RuleGroupTypeAny`, `F extends FullField`, etc. `F` is always the _field object_ type — including in `RuleProps`, where RQB parameterizes by field _name_ instead. Use `GetOptionIdentifierType<F>` for the name.
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
- Conformance (`bun run conformance`) compares the rendered DOM to fixtures recorded from the React package: every element's `class`, each rule group's accessible description, each element's _own_ text verbatim, and the result of curated mutation sequences. Fixtures are downloaded from a pinned upstream tag and are gitignored — never regenerate them locally, which would make the suite tautological.

## Porting from React Query Builder

RQB is the spec for **behavior and rendered output**, not for the API. Two contracts, held to different standards:

**Kept, deliberately.** Class names, `data-testid`s, `data-path`, element structure and document order, and each element's own text. RQB stylesheets and themes have to port over unchanged, and the conformance fixtures are only meaningful because the DOM matches. Diverging here needs a reason and a changelog note.

**Ours to design.** Prop names, control maps, lifecycle flags, generic parameters, and the shape of anything a consumer configures. API parity is _not_ a goal: where RQB's surface exists to work around React — `controlElements` nesting, `enableMountQueryChange`, `useRule`-style hook returns, a `qbId` registry — build the Svelte-shaped equivalent instead of transliterating. Prefer the form a Svelte consumer would expect (top-level snippet props, `bind:`, callback props, runes) over the form that would make a diff against RQB smaller.

When porting a component:

1. Read the RQB source and its tests
2. Reproduce the DOM exactly; design the props for Svelte
3. Translate hooks to runes; drop memoization
4. Port the tests, then the component
5. Note intentional divergences in a comment, in the changelog, and in `docs/differences-from-react-querybuilder.md`

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
13. Removing the `<!-- -->` joiners between sibling elements in `RuleComponents`, `RuleGroupHeader`, `RuleGroupBody`, `RuleGroup`, `MatchModeEditor`, `ShiftActions`, or `ValueEditor`. JSX drops whitespace-only lines between elements; Svelte collapses each gap to a single space and _keeps_ it, which would add text nodes RQB never emits. Conformance compares element text verbatim.
14. Extensionless or directory-style relative imports. `svelte-package` does not rewrite specifiers, so `./foo` and `./types` break Node ESM consumers. Write `./foo.js` and `./types/index.js`; a `*.svelte.ts` rune module is `*.svelte.js`, a component is `*.svelte`. `bun run check:exports` enforces this.

## Quick Reference

**Commands:**

- `bun run build` - Package + CSS
- `bun run check` - svelte-check
- `bun run check:exports` - Package exports/resolution gate
- `bun run test` - Tests
- `bun fmt` - Format
- `bun run test:coverage` - Coverage
- `bun run dev` - Playground

**Directories:**

- `packages/svelte-querybuilder/src/lib/` - Library source (the only published code)
- `packages/svelte-querybuilder/src/routes/` - Dev playground; never published
- `packages/svelte-querybuilder/dist/` - Generated; never edit
- `examples/sveltekit/` - Starter template and the SSR gate
