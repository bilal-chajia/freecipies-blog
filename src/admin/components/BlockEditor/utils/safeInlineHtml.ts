/**
 * Admin inline markdown → safe HTML.
 *
 * Thin wrapper over the shared {@link renderInlineMarkdown} core so the admin
 * preview and the public site share one tokenizer/escaper. Admin renders plain
 * links (no class, no external target); styles are opt-in (default off) and line
 * breaks are preserved by default — matching the previous admin behavior.
 */
import {
  escapeHtml as escapeHtmlShared,
  sanitizeHref as sanitizeHrefShared,
  renderInlineMarkdown as renderInlineMarkdownShared,
} from '@shared/utils/inline-markdown';

interface RenderInlineMarkdownOptions {
  allowStyles?: boolean;
  preserveLineBreaks?: boolean;
}

export const escapeHtml = escapeHtmlShared;
export const sanitizeHref = sanitizeHrefShared;

export const renderInlineMarkdownHtml = (
  text: string | null | undefined,
  options: RenderInlineMarkdownOptions = {}
): string =>
  renderInlineMarkdownShared(text, {
    allowStyles: options.allowStyles ?? false,
    preserveLineBreaks: options.preserveLineBreaks ?? true,
  });

export const toInlineMarkdownHtml = (
  text: string | null | undefined,
  options?: RenderInlineMarkdownOptions
): { __html: string } => ({
  __html: renderInlineMarkdownHtml(text, options),
});
