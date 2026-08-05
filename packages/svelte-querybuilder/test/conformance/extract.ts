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
