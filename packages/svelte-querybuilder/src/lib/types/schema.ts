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
  QueryManager,
  RuleGroupTypeAny,
  RuleType,
  ValidationMap,
  ValueEditorType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import type { Controls } from './controls';
import type { QueryBuilderProps } from './props';
import type { LabelNode } from './translations';

/**
 * Configuration options passed in the `schema` prop from `QueryBuilder` to each subcomponent.
 *
 * Divergences from React Query Builder: no `qbId` and no `dispatchQuery` (there is no Redux
 * store); the {@link QueryManager} driving this query builder is exposed as `manager` instead.
 *
 * @group Props
 */
export interface Schema<F extends FullField, O extends string> {
  /**
   * The {@link QueryManager} driving this query builder. All query mutations go through it.
   */
  manager: QueryManager<RuleGroupTypeAny, F, FullOperator, FullCombinator>;
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
