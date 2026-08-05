<!--
  @component
  Default `matchModeEditor` component: a mode selector, plus a numeric threshold editor for the
  modes that take one (`atleast`/`atmost`/`exactly`).

  Port of React Query Builder's `MatchModeEditor`/`useMatchModeEditor`.
-->
<script lang="ts">
  import type { FullField, MatchMode, Path, RuleType } from '@react-querybuilder/core';
  import { lc, parseNumber } from '@react-querybuilder/core';
  import type { MatchModeEditorProps } from '../types/props';
  import type { Schema } from '../types/schema';

  const dummyFieldData: FullField = { name: '', value: '', label: '' };
  const dummyPath: Path = [];
  const requiresThreshold = (mm?: string | null) =>
    ['atleast', 'atmost', 'exactly'].includes(lc(mm) ?? '');

  const props: MatchModeEditorProps = $props();

  const SelectorComponent = $derived(
    props.selectorComponent ?? props.schema.controls.valueSelector
  );
  const NumericEditorComponent = $derived(
    props.numericEditorComponent ?? props.schema.controls.valueEditor
  );

  const thresholdNum = $derived(
    typeof props.match.threshold === 'number' ? Math.max(0, props.match.threshold) : 1
  );
  const thresholdRule = $derived<RuleType>({ field: '', operator: '=', value: thresholdNum });
  const thresholdSchema = $derived({ ...props.schema, parseNumbers: true } as Schema<
    FullField,
    string
  >);
  const thresholdFieldData = $derived<FullField>(
    props.thresholdPlaceholder
      ? { ...dummyFieldData, placeholder: props.thresholdPlaceholder }
      : dummyFieldData
  );

  const handleChangeMode = (mode: MatchMode) => {
    props.handleOnChange(
      requiresThreshold(mode) && typeof props.match.threshold !== 'number'
        ? { ...props.match, mode, threshold: 1 }
        : { ...props.match, mode }
    );
  };

  const handleChangeThreshold = (threshold: number) => {
    props.handleOnChange({
      ...props.match,
      threshold: parseNumber(threshold, { parseNumbers: true }),
    });
  };
</script>

<SelectorComponent
  schema={props.schema}
  testID={props.testID}
  className={props.className}
  title={props.title}
  handleOnChange={handleChangeMode}
  disabled={props.disabled}
  value={props.match.mode}
  options={props.options}
  multiple={false}
  listsAsArrays={false}
  path={dummyPath}
  level={0} />
{#if requiresThreshold(props.match.mode)}
  <NumericEditorComponent
    skipHook
    testID={props.testID}
    inputType="number"
    title={props.title}
    className={props.className}
    disabled={props.disabled}
    handleOnChange={handleChangeThreshold}
    field=""
    operator=""
    value={thresholdNum}
    valueSource="value"
    fieldData={thresholdFieldData}
    schema={thresholdSchema}
    path={dummyPath}
    level={0}
    rule={thresholdRule} />
{/if}
