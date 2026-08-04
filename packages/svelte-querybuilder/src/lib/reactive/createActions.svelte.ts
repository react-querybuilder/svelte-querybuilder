import type {
  FullCombinator,
  FullField,
  FullOperator,
  Path,
  QueryActions,
  QueryManager,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleType,
} from '@react-querybuilder/core';
import { isRuleGroup } from '@react-querybuilder/core';
import type { QueryBuilderProps } from '../types/props';

/**
 * The `onAdd*`/`onMove*`/`onGroup*`/`onRemove` props return `false` to cancel an operation, a
 * replacement rule/group (for adds), or a replacement query (for moves and groupings).
 */
type Confirmation = unknown;

const isCancelled = (result: Confirmation): boolean => !result;

/**
 * Adapts a {@link QueryManager} to the {@link QueryActions} shape that every subcomponent calls.
 *
 * The manager enforces `maxLevels`, `disabledPaths`, `queryDisabled`, `resetOnFieldChange`, and
 * `resetOnOperatorChange`, so this layer only applies the confirmation callbacks from props.
 * Operations that a callback can veto based on the resulting query are previewed on a clone of
 * the manager, which keeps the manager's own guard logic as the single source of truth.
 *
 * Every action resolves to at most one manager mutation, so each produces exactly one undo entry
 * and one notification. Anything that needs more than one should be wrapped in
 * {@link QueryManager.batch}.
 */
export const createActions = <
  F extends FullField = FullField,
  O extends FullOperator = FullOperator,
>(
  getProps: () => QueryBuilderProps<RuleGroupTypeAny, F, O, FullCombinator>,
  manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>
): QueryActions => {
  /**
   * Runs `mutate` on a throwaway clone and returns the resulting query, or `null` if the
   * operation was a no-op (i.e. the manager aborted it).
   */
  const preview = (
    mutate: (qm: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>) => void
  ): RuleGroupTypeAny | null => {
    const clone = manager.clone();
    const before = clone.getQuery();
    mutate(clone);
    const after = clone.getQuery();
    return Object.is(before, after) ? null : after;
  };

  // oxlint-disable-next-line typescript/no-explicit-any
  const onRuleAdd: QueryActions['onRuleAdd'] = (rule, parentPath, context?: any) => {
    const { onAddRule } = getProps();
    let ruleToAdd: RuleType = rule;
    if (onAddRule) {
      const result = onAddRule(rule as never, parentPath, manager.getQuery() as never, context);
      if (isCancelled(result)) return;
      if (typeof result === 'object') ruleToAdd = result;
    }
    manager.add(ruleToAdd, parentPath);
  };

  // oxlint-disable-next-line typescript/no-explicit-any
  const onGroupAdd: QueryActions['onGroupAdd'] = (group, parentPath, context?: any) => {
    const { onAddGroup } = getProps();
    let groupToAdd: RuleGroupTypeAny = group;
    if (onAddGroup) {
      const result = onAddGroup(group as never, parentPath, manager.getQuery() as never, context);
      if (isCancelled(result)) return;
      if (typeof result === 'object') groupToAdd = result;
    }
    manager.add(groupToAdd, parentPath);
  };

  const onPropChange: QueryActions['onPropChange'] = (prop, value, path) => {
    manager.update(prop as never, value, path);
  };

  // oxlint-disable-next-line typescript/no-explicit-any
  const onRuleOrGroupRemove = (path: Path, context?: any) => {
    const { onRemove } = getProps();
    if (onRemove) {
      const ruleOrGroup = manager.findPath(path);
      if (!ruleOrGroup) return;
      if (!onRemove(ruleOrGroup as never, path, manager.getQuery() as never, context)) return;
    }
    manager.remove(path);
  };

  const moveRule: QueryActions['moveRule'] = (
    oldPath,
    newPath,
    clone,
    // oxlint-disable-next-line typescript/no-explicit-any
    context?: any
  ) => {
    const { onMoveRule, onMoveGroup } = getProps();
    const ruleOrGroup = manager.findPath(oldPath);
    if (!ruleOrGroup) return;
    const confirm = isRuleGroup(ruleOrGroup) ? onMoveGroup : onMoveRule;

    if (confirm) {
      const query = manager.getQuery();
      const nextQuery = preview(qm => qm.move(oldPath, newPath, { clone }));
      if (!nextQuery) return;
      const result = confirm(
        ruleOrGroup as never,
        oldPath,
        newPath,
        query as never,
        nextQuery as never,
        { clone },
        context
      );
      if (isCancelled(result)) return;
      if (typeof result === 'object') {
        manager.setQuery(result as RuleGroupTypeAny);
        return;
      }
    }

    manager.move(oldPath, newPath, { clone });
  };

  const groupRule: QueryActions['groupRule'] = (
    sourcePath,
    targetPath,
    clone,
    // oxlint-disable-next-line typescript/no-explicit-any
    context?: any
  ) => {
    const { onGroupRule, onGroupGroup } = getProps();
    const ruleOrGroup = manager.findPath(sourcePath);
    if (!ruleOrGroup) return;
    const confirm = isRuleGroup(ruleOrGroup) ? onGroupGroup : onGroupRule;

    if (confirm) {
      const query = manager.getQuery();
      const nextQuery = preview(qm => qm.group(sourcePath, targetPath, { clone }));
      if (!nextQuery) return;
      const result = confirm(
        ruleOrGroup as never,
        sourcePath,
        targetPath,
        query as never,
        nextQuery as never,
        { clone },
        context
      );
      if (isCancelled(result)) return;
      if (typeof result === 'object') {
        manager.setQuery(result as RuleGroupType as RuleGroupTypeAny);
        return;
      }
    }

    manager.group(sourcePath, targetPath, { clone });
  };

  return {
    onRuleAdd,
    onGroupAdd,
    onPropChange,
    onRuleRemove: onRuleOrGroupRemove,
    onGroupRemove: onRuleOrGroupRemove,
    moveRule,
    groupRule,
  };
};
