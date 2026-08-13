import type {
  Classnames,
  ControlKey,
  FullField,
  QueryBuilderFlags,
  ValidationMap,
} from '@react-querybuilder/core';
import {
  controlKeys,
  controlKind,
  defaultTranslations,
  mergeAnyTranslations,
  mergeClassnames,
  preferFlagProps,
  preferProp,
} from '@react-querybuilder/core';
import type { Snippet } from 'svelte';
import { getContext, setContext } from 'svelte';
import type {
  Control,
  Controls,
  ControlSnippetProps,
  ControlsProp,
  SvelteControlKey,
} from '../types/controls.js';
import type { QueryBuilderContextProps } from '../types/props.js';
import type { Translations, TranslationsFull } from '../types/translations.js';

/**
 * Module-private context key. Not exported, so the only way in or out is
 * {@link setQueryBuilderContext}/{@link getQueryBuilderContext}.
 */
const contextKey: unique symbol = Symbol('svelte-querybuilder');

const emptyObject = {} as const;

/**
 * Config inherited through Svelte context.
 *
 * A *getter*, not a value: context is set once, during component initialization, while the
 * config it carries is `$derived` and re-created whenever a prop changes. Descendants call the
 * getter from inside their own derivations, so they read through to the current value and track
 * it, instead of capturing whatever existed at initialization.
 */
export const setQueryBuilderContext = <F extends FullField = FullField, O extends string = string>(
  getValue: () => QueryBuilderContextProps<F, O>
): (() => QueryBuilderContextProps<F, O>) => setContext(contextKey, getValue);

/**
 * A getter for the inherited {@link QueryBuilderContextProps}, or `undefined` when there is no
 * provider (or when called outside of component initialization, as in a unit test).
 */
export const getQueryBuilderContext = <
  F extends FullField = FullField,
  O extends string = string,
>(): (() => QueryBuilderContextProps<F, O> | undefined) | undefined => {
  try {
    return getContext<(() => QueryBuilderContextProps<F, O>) | undefined>(contextKey);
  } catch {
    // `getContext` throws outside of component initialization.
    return undefined;
  }
};

/**
 * Controls that exist in core's key list but not in this package: drag-and-drop is a non-goal,
 * and group header/body contents are customized with a snippet or a replacement `ruleGroup`
 * rather than through their own control elements.
 */
const unimplementedControlKeys = [
  'dragHandle',
  'ruleGroupBodyElements',
  'ruleGroupHeaderElements',
] as const satisfies readonly Exclude<ControlKey, SvelteControlKey>[];

/** Fails to compile if core adds a control key this package neither implements nor excludes. */
type _AllControlKeysAccountedFor =
  Exclude<ControlKey, SvelteControlKey | (typeof unimplementedControlKeys)[number]> extends never
    ? true
    : never;

const unimplemented = new Set<string>(unimplementedControlKeys);

/** The control this one falls back to in bulk, or `undefined` if it has no bulk default. */
const bulkKeyFor = (key: SvelteControlKey): 'actionElement' | 'valueSelector' | undefined =>
  controlKind[key] === 'action'
    ? 'actionElement'
    : controlKind[key] === 'selector'
      ? 'valueSelector'
      : undefined;

/**
 * Merges control elements from props, inherited context, and package defaults, giving
 * precedence to props.
 *
 * Within a single level the order is: top-level snippet, `controls` entry, bulk snippet, bulk
 * `controls` entry. Levels are then tried in order — props, context, defaults — so a snippet
 * passed to `QueryBuilder` beats a component inherited from context, and vice versa.
 *
 * `null` is a value, not an absence: it resolves to "render nothing" and stops the search.
 *
 * Which control is an "action" or a "selector" comes from core's {@link controlKind} map rather
 * than from the shape of the key's name, so a future control named e.g. `pathSelector` cannot
 * silently inherit `valueSelector`. Note that `shiftActions` and `undoRedoActions` are *not*
 * action targets despite the plural suffix.
 *
 * The context level arrives already resolved (see `createQueryBuilderState`), so for a nested
 * query builder `defaults` is only reached for keys the outer builder left unset.
 */
export const mergeControls = <F extends FullField, O extends string>(
  propsControls: ControlsProp<F, O> = emptyObject,
  propsSnippets: ControlSnippetProps<F, O> = emptyObject,
  contextControls: ControlsProp<F, O> = emptyObject,
  defaults: Partial<Controls<F, O>> = emptyObject
): Controls<F, O> => {
  const merged: Record<string, unknown> = {};

  // The maps are keyed by control name with a per-key prop type; the merge is uniform across
  // keys, so it works through erased views of them.
  // oxlint-disable-next-line typescript/no-explicit-any
  type AnyControl = Control<any> | null;
  type ControlMap = Record<string, AnyControl | undefined>;
  // oxlint-disable-next-line typescript/no-explicit-any
  type SnippetMap = Record<string, Snippet<[any]> | undefined>;

  const levels: [ControlMap, SnippetMap][] = [
    [propsControls as ControlMap, propsSnippets as SnippetMap],
    [contextControls as ControlMap, emptyObject],
  ];
  const defaultsMap = defaults as ControlMap;

  for (const key of controlKeys) {
    if (unimplemented.has(key)) continue;

    const k = key as SvelteControlKey;
    const bulkKey = bulkKeyFor(k);

    // `??` is deliberately not used to chain these: `null` is an explicit "render nothing" that
    // must stop the search, while `undefined` means the level said nothing.
    let control: AnyControl | undefined;

    for (const [ce, sn] of levels) {
      const keyedSnippet = sn[k];
      if (keyedSnippet) {
        control = { snippet: keyedSnippet };
        break;
      }
      if (ce[k] !== undefined) {
        control = ce[k];
        break;
      }
      if (!bulkKey) continue;
      const bulkSnippet = sn[bulkKey];
      if (bulkSnippet) {
        control = { snippet: bulkSnippet };
        break;
      }
      if (ce[bulkKey] !== undefined) {
        control = ce[bulkKey];
        break;
      }
    }

    merged[k] = (control === undefined ? defaultsMap[k] : control) ?? null;
  }

  return merged as Controls<F, O>;
};

/**
 * Merged translations: props > context > {@link defaultTranslations}.
 */
export const mergeTranslations = (
  propsT?: Partial<Translations>,
  contextT?: Partial<Translations>
): TranslationsFull =>
  mergeAnyTranslations(
    defaultTranslations as unknown as Record<string, Record<string, unknown>>,
    contextT as Record<string, Record<string, unknown>> | undefined,
    propsT as Record<string, Record<string, unknown>> | undefined
  ) as unknown as TranslationsFull;

/**
 * The fully resolved configuration for a query builder.
 */
export interface MergedQueryBuilderConfig<F extends FullField, O extends string> extends Required<
  Omit<QueryBuilderFlags, 'preserveQueryStateOnUnmount' | 'enableMountQueryChange'>
> {
  classNames: Classnames;
  controls: Controls<F, O>;
  translations: TranslationsFull;
}

/**
 * Merges props, inherited context, and package defaults into a single configuration object,
 * with props taking precedence.
 *
 * `enableDragAndDrop` is always `false`; drag-and-drop is a non-goal. The flag is retained only
 * because it feeds the `data-dnd` attribute on the wrapper element.
 */
export const mergeQueryBuilderConfig = <F extends FullField, O extends string>({
  props = emptyObject,
  context,
  defaultControls,
}: {
  props?: QueryBuilderContextProps<F, O>;
  context?: QueryBuilderContextProps<F, O>;
  defaultControls?: Partial<Controls<F, O>>;
}): MergedQueryBuilderConfig<F, O> => {
  const flags = preferFlagProps(props, context, true) as Required<QueryBuilderFlags>;

  return {
    ...flags,
    // Never enabled: drag-and-drop is a non-goal for this package.
    enableDragAndDrop: false,
    debugMode: preferProp(false, props.debugMode, context?.debugMode),
    classNames: mergeClassnames(context?.controlClassnames, props.controlClassnames),
    controls: mergeControls(props.controls, props, context?.controls, defaultControls),
    translations: mergeTranslations(props.translations, context?.translations),
  };
};

/**
 * The validation result and map for a query, as {@link deriveQueryBuilderClassNames} and
 * `Schema.validationMap` expect them.
 */
export const emptyValidationMap: ValidationMap = {};
