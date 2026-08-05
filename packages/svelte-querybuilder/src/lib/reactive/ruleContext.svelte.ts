import type {
  FullCombinator,
  FullField,
  FullOperator,
  Path,
  QueryManager,
  RuleContext,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';

/**
 * A reactive wrapper around a derived value.
 */
export interface Derived<T> {
  readonly current: T;
}

/**
 * The resolved {@link RuleContext} for the rule at `getPath`, recomputed whenever the query
 * identity changes.
 *
 * This is the single-call form of the derivation: `QueryManager.getRuleContext` resolves field
 * data, operators, value editor type, value list, value sources, match modes, and the validation
 * result in one pass. Svelte's reactivity is fine-grained enough that decomposing it into
 * granular accessors buys nothing.
 *
 * @param getManager - The manager driving the query.
 * @param getPath - The rule's path.
 * @param getQuery - The reactive query. Read only to establish a dependency; the manager holds
 * the authoritative copy.
 */
export const createRuleContext = <F extends FullField = FullField>(
  getManager: () => QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>,
  getPath: () => Path,
  getQuery: () => RuleGroupTypeAny
): Derived<RuleContext<F> | null> => {
  const context = $derived.by(() => {
    // Establishes the dependency on query identity.
    getQuery();
    return getManager().getRuleContext(getPath());
  });

  return {
    get current() {
      return context;
    },
  };
};
