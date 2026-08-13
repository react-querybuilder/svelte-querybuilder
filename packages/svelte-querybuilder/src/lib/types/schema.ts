import type {
  AccessibleDescriptionGenerator,
  Classname,
  Classnames,
  FullCombinator,
  FullField,
  FullOperator,
  FullOption,
  FullOptionList,
  GetOptionIdentifierType,
  InputType,
  MatchModeOptions,
  Option,
  ParseNumbersPropConfig,
  Path,
  RuleGroupTypeAny,
  RuleType,
  ValidationMap,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import type { Controls } from './controls.js';
import type { QueryBuilderProps } from './props.js';
import type { LabelNode } from './translations.js';

/**
 * The undo/redo stacks for a query builder. Reading `canUndo`/`canRedo` is reactive: both are
 * getters over the state that backs the stacks, so a component that reads one re-renders when
 * it changes.
 *
 * @group Props
 */
export interface QueryHistory {
  /** Whether there is a previous query to restore. */
  readonly canUndo: boolean;
  /** Whether there is an undone query to restore. */
  readonly canRedo: boolean;
  /** Restores the previous query. No-op when `canUndo` is `false`. */
  undo(): void;
  /** Restores the most recently undone query. No-op when `canRedo` is `false`. */
  redo(): void;
  /** Discards both stacks without changing the current query. */
  clear(): void;
}

/**
 * Configuration options passed in the `schema` prop from `QueryBuilder` to each subcomponent.
 *
 * Query mutations go through the `actions` prop; this carries configuration and the resolved
 * field/operator/value derivations that every control needs.
 *
 * @group Props
 */
export interface Schema<F extends FullField, O extends string> {
  /** The undo/redo stacks. Read by `UndoRedoActions`. */
  history: QueryHistory;
  fields: FullOptionList<F>;
  fieldMap: Partial<Record<GetOptionIdentifierType<F>, F>>;
  classNames: Classnames;
  combinators: FullOptionList<FullCombinator>;
  getParameters(
    field?: string,
    operator?: string,
    meta?: { fieldData: F }
  ): FullOptionList<FullOption>;
  controls: Controls<F, O>;
  createRule(): RuleType;
  createRuleGroup(ic?: boolean): RuleGroupTypeAny;
  getQuery(): RuleGroupTypeAny;
  getOperators(field: string, meta: { fieldData: F }): FullOptionList<FullOperator>;
  getValueEditorType(field: string, operator: string, meta: { fieldData: F }): ValueEditorType;
  getValueEditorSeparator(field: string, operator: string, meta: { fieldData: F }): LabelNode;
  getValueSources(field: string, operator: string, meta: { fieldData: F }): ValueSourceFullOptions;
  getInputType(field: string, operator: string, meta: { fieldData: F }): InputType | null;
  getValues(field: string, operator: string, meta: { fieldData: F }): FullOptionList<Option>;
  getRuleDefaultValue(rule: RuleType): unknown;
  getRuleDefaultOperator(field: string): string;
  getMatchModes(field: string, misc: { fieldData: F }): MatchModeOptions;
  getSubQueryBuilderProps(
    field: GetOptionIdentifierType<F>,
    misc: { fieldData: F }
  ): QueryBuilderProps<RuleGroupTypeAny, FullOption, FullOption, FullOption>;
  getRuleClassname(rule: RuleType, misc: { fieldData: F }): Classname;
  getRuleGroupClassname(ruleGroup: RuleGroupTypeAny): Classname;
  accessibleDescriptionGenerator: AccessibleDescriptionGenerator;
  showCombinatorsBetweenRules: boolean;
  showNotToggle: boolean;
  showShiftActions: boolean;
  showUndoRedo: boolean;
  showCloneButtons: boolean;
  showLockButtons: boolean;
  showMuteButtons: boolean;
  autoSelectField: boolean;
  autoSelectOperator: boolean;
  autoSelectValue: boolean;
  addRuleToNewGroups: boolean;
  enableDragAndDrop: boolean;
  validationMap: ValidationMap;
  independentCombinators: boolean;
  listsAsArrays: boolean;
  parseNumbers: ParseNumbersPropConfig;
  disabledPaths: Path[];
  suppressStandardClassnames: boolean;
  maxLevels: number;
  resetOnFieldChange: boolean;
  resetOnOperatorChange: boolean;
}
