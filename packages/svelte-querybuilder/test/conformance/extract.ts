/**
 * The jsdom counterpart to `utils/conformance/extract.ts` upstream.
 *
 * Upstream walks a markup *string* with Bun's `HTMLRewriter`, because React renders to a string.
 * Svelte renders into a DOM, so this walks the DOM instead — which is simpler, since document
 * order and ancestry are already materialized and the void-element workaround (`HTMLRewriter`
 * throws from `onEndTag` for void elements) is unnecessary.
 *
 * The output shape must match upstream's byte for byte, including key insertion order, because
 * the tests assert deep equality against the recorded fixtures.
 */

/** One element's contribution to the rendered class surface, in document order. */
export interface ClassNameEntry {
  /** Lowercased tag name. */
  tag: string;
  /** `data-testid`, when present. */
  testID?: string;
  /**
   * The `data-path` of the nearest enclosing rule or rule group (or of the element itself, for
   * the rule/group element). Absent for chrome outside any rule, i.e. the root wrapper.
   */
  path?: string;
  /** The verbatim `class` attribute. Whitespace is preserved; this is a byte-level claim. */
  className: string;
  /**
   * The concatenation of this element's *own* direct text-node children, verbatim — no trimming,
   * no whitespace collapsing, no descendant text. `''` when the element has no direct text nodes
   * (present rather than omitted, so the key set is stable across entries).
   *
   * Verbatim is the point: the drift this channel catches is a stray space inside a label or a
   * whitespace text node emitted by a template compiler — exactly the SFC-whitespace hazard, and
   * invisible under any normalization (jest-dom's `toHaveTextContent` included). Descendant text
   * is deliberately excluded: `textContent` would repeat one label at every ancestor level.
   *
   * Recorded only by `schemaVersion` 3 fixtures; see `stripUnrecordedChannels` in `cases.ts`.
   */
  text: string;
}

/** The accessible description (`title`) of one rule group. */
export interface AccessibleDescriptionEntry {
  path: string;
  description: string;
}

export interface ExtractResult {
  classNames: ClassNameEntry[];
  accessibleDescriptions: AccessibleDescriptionEntry[];
}

const RULE_GROUP_TESTID = 'rule-group';

/**
 * Extracts the class surface and the accessible descriptions from a rendered query builder.
 *
 * `container` is Testing Library's wrapper element; it is not itself part of the rendered
 * output, so only its descendants are walked.
 */
export const extract = (container: Element): ExtractResult => {
  const classNames: ClassNameEntry[] = [];
  const accessibleDescriptions: AccessibleDescriptionEntry[] = [];

  // `querySelectorAll('*')` is documented to return elements in document order, which is exactly
  // the order `HTMLRewriter` visits start tags in. Ancestry is read per element rather than via
  // a stack, since the DOM already has it.
  for (const element of container.querySelectorAll('*')) {
    const ownPath = element.getAttribute('data-path') ?? undefined;
    const path = ownPath ?? element.closest('[data-path]')?.getAttribute('data-path') ?? undefined;

    const tag = element.tagName.toLowerCase();
    const testID = element.getAttribute('data-testid') ?? undefined;
    const className = element.getAttribute('class');

    if (className !== null) {
      classNames.push({
        tag,
        ...(testID === undefined ? {} : { testID }),
        ...(path === undefined ? {} : { path }),
        className,
        // Direct text-node children only, in document order. `Node.TEXT_NODE` is spelled `3`
        // rather than referenced off the constructor, matching upstream.
        text: [...element.childNodes]
          .filter(node => node.nodeType === 3)
          .map(node => node.nodeValue ?? '')
          .join(''),
      });
    }

    if (testID === RULE_GROUP_TESTID && ownPath !== undefined) {
      const description = element.getAttribute('title');
      if (description !== null) {
        accessibleDescriptions.push({ path: ownPath, description });
      }
    }
  }

  return { classNames, accessibleDescriptions };
};
