import type {
  Classnames,
  FullField,
  QueryBuilderFlags,
  ValidationMap,
} from '@react-querybuilder/core';
import {
  defaultTranslations,
  mergeAnyTranslations,
  mergeClassnames,
  preferFlagProps,
  preferProp,
} from '@react-querybuilder/core';
import type { Component, Snippet } from 'svelte';
import { getContext, setContext } from 'svelte';
import { snippetToComponent } from '../internal/snippetToComponent';
import type { ControlElementsProp, Controls, ControlSnippets } from '../types/controls';
import type { QueryBuilderContextProps } from '../types/props';
import type { Translations, TranslationsFull } from '../types/translations';

/**
 * Module-private context key. Not exported, so the only way in or out is
 * {@link setQueryBuilderContext}/{@link getQueryBuilderContext}.
 */
const contextKey: unique symbol = Symbol('svelte-querybuilder');

const emptyObject = {} as const;

/**
 * A component that renders nothing. Used in place of a `null` entry in the `controlElements`
 * prop, so every key of {@link Controls} is always a renderable component.
 *
 * Works in both client and server modes: Svelte calls a component function with
 * `(anchor|payload, props)` and only reads the returned object for its exports.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export const nullComponent = ((): Record<string, never> => ({})) as unknown as Component<any>;

/**
 * Config inherited through Svelte context. Unlike React Query Builder's context, this carries
 * configuration only—query state lives in the `QueryManager`, so nothing here is stateful and
 * the value can safely be set once during component initialization.
 *
 * Pass a `$state` object (or an object with getters) if any of the values must stay reactive.
 */
export const setQueryBuilderContext = <F extends FullField = FullField, O extends string = string>(
  value: QueryBuilderContextProps<F, O>
): QueryBuilderContextProps<F, O> => setContext(contextKey, value);

/**
 * The inherited {@link QueryBuilderContextProps}, or `undefined` when there is no provider (or
 * when called outside of component initialization, as in a unit test).
 */
export const getQueryBuilderContext = <
  F extends FullField = FullField,
  O extends string = string,
>(): QueryBuilderContextProps<F, O> | undefined => {
  try {
    return getContext<QueryBuilderContextProps<F, O> | undefined>(contextKey);
  } catch {
    // `getContext` throws outside of component initialization.
    return undefined;
  }
};

/**
 * A control element key that is overridden in bulk by `actionElement`.
 */
const isActionKey = (key: string): boolean => key.endsWith('Action') || key.endsWith('Actions');

/**
 * A control element key that is overridden in bulk by `valueSelector`.
 */
const isSelectorKey = (key: string): boolean => key.endsWith('Selector');

/**
 * Every key of {@link Controls}, in a stable order.
 */
const controlKeys = [
  'actionElement',
  'addGroupAction',
  'addRuleAction',
  'cloneGroupAction',
  'cloneRuleAction',
  'combinatorSelector',
  'fieldSelector',
  'inlineCombinator',
  'lockGroupAction',
  'lockRuleAction',
  'matchModeEditor',
  'muteGroupAction',
  'muteRuleAction',
  'notToggle',
  'operatorSelector',
  'removeGroupAction',
  'removeRuleAction',
  'rule',
  'ruleGroup',
  'shiftActions',
  'undoRedoActions',
  'valueEditor',
  'valueSelector',
  'valueSourceSelector',
] as const satisfies readonly (keyof Controls<FullField, string>)[];

/**
 * The wrapped component for a named snippet prop, or `undefined` if that prop is absent.
 */
const snippetFor = <F extends FullField, O extends string>(
  source: ControlSnippets<F, O>,
  snippetKey: string
  // oxlint-disable-next-line typescript/no-explicit-any
): Component<any> | undefined => {
  const snippet = (source as Record<string, Snippet<[never]> | undefined>)[snippetKey];
  return snippet ? snippetToComponent(snippet as Snippet<[Record<string, unknown>]>) : undefined;
};

/**
 * Merges `controlElements` and snippet props from props, context, and defaults, giving
 * precedence to props.
 *
 * Mirrors `useMergedContext`: a `null` entry resolves to {@link nullComponent} (rendering
 * nothing), `actionElement` is a bulk override for every `*Action`/`*Actions` key, and
 * `valueSelector` is a bulk override for every `*Selector` key. Bulk overrides never apply to
 * `valueEditor`, `rule`, `ruleGroup`, `inlineCombinator`, `notToggle`, or `matchModeEditor`.
 *
 * Snippets are the Svelte-native customization point and are resolved first. Within a level the
 * order is: keyed snippet, keyed component, bulk snippet, bulk component. Levels are then tried
 * in order—props, context, defaults—so a snippet passed to `QueryBuilder` beats a component
 * inherited from context, and vice versa.
 */
export const mergeControlElements = <F extends FullField, O extends string>(
  propsCE: ControlElementsProp<F, O> = emptyObject,
  contextCE: ControlElementsProp<F, O> = emptyObject,
  defaults: Partial<Controls<F, O>> = emptyObject,
  propsSnippets: ControlSnippets<F, O> = emptyObject,
  contextSnippets: ControlSnippets<F, O> = emptyObject
): Controls<F, O> => {
  const merged: Record<string, unknown> = {};

  for (const key of controlKeys) {
    /**
     * Resolves one level (props or context) to a component, `nullComponent`, or `undefined`
     * meaning "fall through to the next level".
     */
    const resolveLevel = (
      ce: ControlElementsProp<F, O>,
      sn: ControlSnippets<F, O>
      // oxlint-disable-next-line typescript/no-explicit-any
    ): Component<any> | undefined => {
      const keyed = snippetFor(sn, `${key}Snippet`);
      if (keyed) return keyed;

      const comp = ce[key];
      if (comp === null) return nullComponent;
      if (comp) return comp;

      const bulkSnippet =
        (isActionKey(key) ? snippetFor(sn, 'actionElementSnippet') : undefined) ??
        (isSelectorKey(key) ? snippetFor(sn, 'valueSelectorSnippet') : undefined);
      if (bulkSnippet) return bulkSnippet;

      return (
        (isActionKey(key) ? ce.actionElement : undefined) ??
        (isSelectorKey(key) ? ce.valueSelector : undefined)
      );
    };

    const comp =
      resolveLevel(propsCE, propsSnippets) ??
      resolveLevel(contextCE, contextSnippets) ??
      defaults[key];

    if (comp) merged[key] = comp;
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
  Omit<QueryBuilderFlags, 'preserveQueryStateOnUnmount'>
> {
  classNames: Classnames;
  controls: Controls<F, O>;
  translations: TranslationsFull;
}

/**
 * Merges props, inherited context, and package defaults into a single configuration object,
 * with props taking precedence.
 *
 * Deviations from React Query Builder's `useMergedContext`:
 *
 * - `preserveQueryStateOnUnmount` is not supported (there is no store to preserve).
 * - `enableDragAndDrop` is always `false`; drag-and-drop is a non-goal. The flag is retained
 *   only because it feeds the `data-dnd` attribute on the wrapper element.
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
    controls: mergeControlElements(
      props.controlElements,
      context?.controlElements,
      defaultControls,
      props,
      context
    ),
    translations: mergeTranslations(props.translations, context?.translations),
  };
};

/**
 * The validation result and map for a query, as {@link deriveQueryBuilderClassNames} and
 * `Schema.validationMap` expect them.
 */
export const emptyValidationMap: ValidationMap = {};
