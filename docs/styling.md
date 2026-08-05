# Styling

The rendered DOM is class-compatible with [React Query Builder](https://react-querybuilder.js.org): same element structure, same class names, same `data-testid` and `data-path` attributes. Existing RQB stylesheets and custom themes work here unchanged.

## Stylesheets

Two prebuilt stylesheets ship in `dist`:

```ts
// Full: layout + default aesthetic (borders, colors, branch lines).
import 'svelte-querybuilder/dist/query-builder.css';

// Structure only: flex layout and spacing, no colors or borders.
import 'svelte-querybuilder/dist/query-builder-layout.css';
```

Import either one once, at the root of your app (`+layout.svelte` in SvelteKit, `main.ts` in a plain Vite app). They are marked side-effectful, so bundlers will not tree-shake them away.

The `.scss` sources are published alongside the compiled CSS if you want to compile them yourself with different variable values:

```scss
// Override any Sass variable before the `@use`, then compile.
@use 'svelte-querybuilder/dist/query-builder' with (
  $rqb-spacing: 0.75rem,
  $rqb-base-color: #7c3aed,
  $rqb-border-radius: 0.5rem
);
```

## CSS custom properties

Most of the visual design is exposed as custom properties on `:root`, so you can retheme without touching Sass or rebuilding anything. Override them anywhere that wins the cascade.

| Property                 | Default                                  | Controls                                |
| ------------------------ | ---------------------------------------- | --------------------------------------- |
| `--rqb-spacing`          | `0.5rem`                                 | Gap between and inside rules and groups |
| `--rqb-base-color`       | `#004bb8`                                | Accent color; seeds the background      |
| `--rqb-background-color` | `color-mix(in srgb, transparent, … 20%)` | Group background                        |
| `--rqb-border-color`     | `#8081a2`                                | Group and rule borders                  |
| `--rqb-border-style`     | `solid`                                  | Border style                            |
| `--rqb-border-width`     | `1px`                                    | Border width                            |
| `--rqb-border-radius`    | `0.25rem`                                | Corner radius                           |
| `--rqb-branch-indent`    | `var(--rqb-spacing)`                     | Indent per nesting level                |
| `--rqb-branch-color`     | `var(--rqb-border-color)`                | Branch-line color                       |
| `--rqb-branch-style`     | `var(--rqb-border-style)`                | Branch-line style                       |
| `--rqb-branch-width`     | `var(--rqb-border-width)`                | Branch-line width                       |
| `--rqb-branch-radius`    | `var(--rqb-border-radius)`               | Branch-line corner radius               |

The `--rqb-dnd-*` properties exist in the stylesheet (it is core's, verbatim) but have no effect here — drag-and-drop is a [non-goal](./differences-from-react-querybuilder.md).

### Example: a dark, roomier theme

```svelte
<QueryBuilder {fields} bind:query />

<style>
  :global(:root) {
    --rqb-spacing: 0.75rem;
    --rqb-base-color: #7c3aed;
    --rqb-border-color: #3f3f46;
    --rqb-border-radius: 0.5rem;
  }
</style>
```

`:global` is required: Svelte scopes component styles by adding a class to elements the component itself renders, and `:root` is not one of them.

## Overriding class names

The same caveat applies to targeting the query builder's own elements from a parent component's `<style>` block — they are rendered by `svelte-querybuilder`, not by your component, so they do not carry your component's scoping class:

```svelte
<style>
  :global(.queryBuilder .ruleGroup) {
    border-style: dashed;
  }
</style>
```

Key class names:

| Class                    | Element                              |
| ------------------------ | ------------------------------------ |
| `.queryBuilder`          | Root wrapper                         |
| `.ruleGroup`             | Every group, including the root      |
| `.ruleGroup-header`      | Combinator/not-toggle/add-button row |
| `.ruleGroup-body`        | Child rules and groups               |
| `.rule`                  | A single rule                        |
| `.rule-fields`           | Field selector                       |
| `.rule-operators`        | Operator selector                    |
| `.rule-value`            | Value editor                         |
| `.betweenRules`          | Inline combinator between rules      |
| `.queryBuilder-invalid`  | Applied when validation fails        |
| `.queryBuilder-disabled` | Applied to disabled rules and groups |

## Custom class names in JS

`controlClassnames` adds classes to any control without CSS overrides:

```svelte
<QueryBuilder
  {fields}
  bind:query
  controlClassnames={{ addRule: 'btn btn-primary', removeRule: 'btn btn-danger' }} />
```

To drop the built-in classes entirely and style from scratch, pass `suppressStandardClassnames`. Only the classes you supply through `controlClassnames` will be emitted.
