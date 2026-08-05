import type {
  BaseTranslation,
  BaseTranslations,
  BaseTranslationWithLabel,
  BaseTranslationWithPlaceholders,
} from '@react-querybuilder/core';
import type { Snippet } from 'svelte';

/**
 * Anything that can be rendered as a label: a plain string, or a zero-argument {@link Snippet}.
 *
 * @group Props
 */
export type LabelNode = Snippet | string;

/**
 * A translation for a component with `title` and `label`.
 *
 * @group Props
 */
export interface TranslationWithLabel extends BaseTranslationWithLabel<LabelNode> {}

/**
 * A translation for a component with `title` only.
 *
 * @group Props
 */
export interface Translation extends BaseTranslation {}

/**
 * A translation for a component with `title` and a placeholder.
 *
 * @group Props
 */
export interface TranslationWithPlaceholders extends BaseTranslationWithPlaceholders {}

/**
 * The shape of the `translations` prop.
 *
 * @group Props
 */
export interface Translations extends BaseTranslations<LabelNode> {}

/**
 * The full `translations` interface with all properties required.
 *
 * @group Props
 */
export type TranslationsFull = {
  [K in keyof Translations]: { [T in keyof Translations[K]]-?: Translations[K][T] };
};
