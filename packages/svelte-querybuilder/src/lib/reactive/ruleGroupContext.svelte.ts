import type {
  FullCombinator,
  FullField,
  FullOperator,
  Path,
  QueryManager,
  RuleGroupContext,
  RuleGroupTypeAny,
} from '@react-querybuilder/core';
import type { Derived } from './ruleContext.svelte.js';

/**
 * The resolved {@link RuleGroupContext} for the group at `getPath`, recomputed whenever the
 * query identity changes. The single-call counterpart to `createRuleContext`.
 *
 * @param getManager - The manager driving the query.
 * @param getPath - The group's path. The root group's path is `[]`.
 * @param getQuery - The reactive query. Read only to establish a dependency.
 */
export const createRuleGroupContext = <F extends FullField = FullField>(
  getManager: () => QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>,
  getPath: () => Path,
  getQuery: () => RuleGroupTypeAny
): Derived<RuleGroupContext<FullCombinator> | null> => {
  const context = $derived.by(() => {
    // Establishes the dependency on query identity.
    getQuery();
    return getManager().getRuleGroupContext(getPath());
  });

  return {
    get current() {
      return context;
    },
  };
};
