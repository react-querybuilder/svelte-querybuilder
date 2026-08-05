import type { FullField } from '@react-querybuilder/core';
import { nullComponent } from '../reactive/context.svelte';
import type { Controls } from '../types/controls';
import ActionElement from './ActionElement.svelte';
import Rule from './Rule.svelte';
import RuleGroup from './RuleGroup.svelte';
import ValueEditor from './ValueEditor.svelte';
import ValueSelector from './ValueSelector.svelte';

/**
 * The default component for every control.
 *
 * Milestone A of the implementation plan ships six components; the remaining controls
 * (`inlineCombinator`, `matchModeEditor`, `notToggle`, `shiftActions`, `undoRedoActions`)
 * resolve to a component that renders nothing until step 5. Each is gated behind a flag that
 * defaults to `false`, or—for `inlineCombinator`—behind `showCombinatorsBetweenRules` or an
 * independent-combinators query.
 */
export const defaultControlElements: Controls<FullField, string> = {
  actionElement: ActionElement,
  addGroupAction: ActionElement,
  addRuleAction: ActionElement,
  cloneGroupAction: ActionElement,
  cloneRuleAction: ActionElement,
  combinatorSelector: ValueSelector,
  fieldSelector: ValueSelector,
  inlineCombinator: nullComponent,
  lockGroupAction: ActionElement,
  lockRuleAction: ActionElement,
  matchModeEditor: nullComponent,
  muteGroupAction: ActionElement,
  muteRuleAction: ActionElement,
  notToggle: nullComponent,
  operatorSelector: ValueSelector,
  removeGroupAction: ActionElement,
  removeRuleAction: ActionElement,
  rule: Rule,
  ruleGroup: RuleGroup,
  shiftActions: nullComponent,
  undoRedoActions: nullComponent,
  valueEditor: ValueEditor,
  valueSelector: ValueSelector,
  valueSourceSelector: ValueSelector,
} as Controls<FullField, string>;
