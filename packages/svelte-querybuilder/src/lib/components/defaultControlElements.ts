import type { FullField } from '@react-querybuilder/core';
import type { Controls } from '../types/controls';
import ActionElement from './ActionElement.svelte';
import InlineCombinator from './InlineCombinator.svelte';
import MatchModeEditor from './MatchModeEditor.svelte';
import NotToggle from './NotToggle.svelte';
import Rule from './Rule.svelte';
import RuleGroup from './RuleGroup.svelte';
import ShiftActions from './ShiftActions.svelte';
import UndoRedoActions from './UndoRedoActions.svelte';
import ValueEditor from './ValueEditor.svelte';
import ValueSelector from './ValueSelector.svelte';

/**
 * The default component for every control.
 *
 * Divergence from React Query Builder: `undoRedoActions` has a default here. Upstream it is
 * `null` unless the `react-querybuilder/history` entry point is used, because history lives in
 * the Redux store; here `QueryManager` owns it and is always constructed with `history: true`.
 */
export const defaultControlElements: Controls<FullField, string> = {
  actionElement: ActionElement,
  addGroupAction: ActionElement,
  addRuleAction: ActionElement,
  cloneGroupAction: ActionElement,
  cloneRuleAction: ActionElement,
  combinatorSelector: ValueSelector,
  fieldSelector: ValueSelector,
  inlineCombinator: InlineCombinator,
  lockGroupAction: ActionElement,
  lockRuleAction: ActionElement,
  matchModeEditor: MatchModeEditor,
  muteGroupAction: ActionElement,
  muteRuleAction: ActionElement,
  notToggle: NotToggle,
  operatorSelector: ValueSelector,
  removeGroupAction: ActionElement,
  removeRuleAction: ActionElement,
  rule: Rule,
  ruleGroup: RuleGroup,
  shiftActions: ShiftActions,
  undoRedoActions: UndoRedoActions,
  valueEditor: ValueEditor,
  valueSelector: ValueSelector,
  valueSourceSelector: ValueSelector,
} as Controls<FullField, string>;
