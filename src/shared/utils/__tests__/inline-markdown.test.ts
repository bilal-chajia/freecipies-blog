import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeHref, renderInlineMarkdown } from '../inline-markdown';

describe('escapeHtml', () => {
  it('neutralizes HTML-significant characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('a & b "c" \'d\'')).toBe('a &amp; b &quot;c&quot; &#39;d&#39;');
  });

  it('coerces nullish to empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeHref', () => {
  it('keeps relative, anchor, and safe-protocol URLs', () => {
    expect(sanitizeHref('/recipes')).toBe('/recipes');
    expect(sanitizeHref('#section')).toBe('#section');
    expect(sanitizeHref('https://example.com')).toBe('https://example.com');
    expect(sanitizeHref('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('rejects dangerous protocols', () => {
    expect(sanitizeHref('javascript:alert(1)')).toBe('');
    expect(sanitizeHref('data:text/html,<script>')).toBe('');
  });
});

describe('renderInlineMarkdown — security (P0)', () => {
  it('escapes raw HTML in plain text', () => {
    expect(renderInlineMarkdown('hello <b>x</b> & <i>y</i>')).toBe(
      'hello &lt;b&gt;x&lt;/b&gt; &amp; &lt;i&gt;y&lt;/i&gt;'
    );
  });

  it('escapes HTML inside a link label', () => {
    expect(renderInlineMarkdown('[<img onerror=x>](https://e.com)')).toBe(
      '<a href="https://e.com">&lt;img onerror=x&gt;</a>'
    );
  });

  it('drops a javascript: link but keeps the (escaped) label text', () => {
    expect(renderInlineMarkdown('[click <x>](javascript:alert)')).toBe('click &lt;x&gt;');
  });
});

describe('renderInlineMarkdown — inline styles', () => {
  it('renders bold, italic, and bold-italic', () => {
    expect(renderInlineMarkdown('a **b** c')).toBe('a <strong>b</strong> c');
    expect(renderInlineMarkdown('a *b* c')).toBe('a <em>b</em> c');
    expect(renderInlineMarkdown('a ***b*** c')).toBe('a <strong><em>b</em></strong> c');
  });

  it('does not parse styles when allowStyles is false', () => {
    expect(renderInlineMarkdown('a **b**', { allowStyles: false })).toBe('a **b**');
  });

  it('escapes HTML even when it sits next to markdown markers', () => {
    expect(renderInlineMarkdown('**<b>**')).toBe('<strong>&lt;b&gt;</strong>');
  });
});

describe('renderInlineMarkdown — link decoration policy', () => {
  it('renders plain links by default (admin policy)', () => {
    expect(renderInlineMarkdown('[home](/x)')).toBe('<a href="/x">home</a>');
  });

  it('adds class and external target when configured (site policy)', () => {
    expect(
      renderInlineMarkdown('[ext](https://e.com)', {
        linkClassName: 'lnk',
        externalLinkTarget: true,
      })
    ).toBe('<a href="https://e.com" class="lnk" target="_blank" rel="noreferrer noopener">ext</a>');
  });

  it('does not add target/rel for internal links under site policy', () => {
    expect(
      renderInlineMarkdown('[home](/x)', { linkClassName: 'lnk', externalLinkTarget: true })
    ).toBe('<a href="/x" class="lnk">home</a>');
  });
});

describe('renderInlineMarkdown — line breaks', () => {
  it('converts newlines to <br /> when preserveLineBreaks is set', () => {
    expect(renderInlineMarkdown('a\nb', { preserveLineBreaks: true })).toBe('a<br />b');
  });

  it('leaves newlines untouched by default', () => {
    expect(renderInlineMarkdown('a\nb')).toBe('a\nb');
  });
});
