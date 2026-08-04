import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';

vi.mock('@modules/media', () => {
  throw new Error('P3C homepage sections must not depend on the media loader');
});

const { getArticles, getArticleById, getArticlesByIds, getCategories, getAuthors } = vi.hoisted(() => ({
  getArticles: vi.fn(),
  getArticleById: vi.fn(),
  getArticlesByIds: vi.fn(),
  getCategories: vi.fn(),
  getAuthors: vi.fn(),
}));

vi.mock('@modules/articles', () => ({ getArticles, getArticleById, getArticlesByIds }));
vi.mock('@modules/categories', () => ({ getCategories }));
vi.mock('@modules/authors', () => ({ getAuthors }));
vi.mock('@shared/utils/hydration', () => ({ hydrateCategory: (c: unknown) => c }));

import { getRenderableSocialFeed, resolveHomeData } from '../home-data';
import { isExternalHomepageCtaHref } from '../homepage-cta';
import type {
  HomepageSection,
  HomepageSocialFeedSection,
} from '@modules/settings/types/settings.types';

const DB = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  getArticles.mockResolvedValue({ items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
  // Batched resolver returns hydrated stubs in input order.
  getArticlesByIds.mockImplementation(async (_db: unknown, ids: number[]) =>
    ids.map((id) => ({ id }) as never),
  );
  getCategories.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  getAuthors.mockResolvedValue([{ id: 9, is_featured: true }, { id: 10, is_featured: false }]);
});

it('skips disabled sections', async () => {
  const sections: HomepageSection[] = [
    { id: 'latest', type: 'latest', enabled: false, title: 'L', count: 4 },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms).toHaveLength(0);
});

it('resolves latest recipes via getArticles and respects count', async () => {
  const sections: HomepageSection[] = [
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 2 },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms[0]).toMatchObject({ kind: 'latest' });
  expect((vms[0] as { recipes: unknown[] }).recipes).toHaveLength(2);
  expect(getArticles).toHaveBeenCalledWith(DB, expect.objectContaining({ type: 'recipe', workflow_status: 'published' }));
});

it('fetches the shared latest list once for featured + latest, plus one trending call for hero', async () => {
  const sections: HomepageSection[] = [
    { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
    { id: 'featured', type: 'featured_recipes', enabled: true, title: 'F', subtitle: '', source: 'latest', category_slug: null, count: 4, refs: [] },
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 4 },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  // Hero fallback uses its own trending cache; featured (latest source) and
  // latest share the latest cache — so exactly two getArticles calls total.
  expect(getArticles).toHaveBeenCalledTimes(2);
  const calls = (getArticles as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  expect(calls.filter((c) => (c[1] as { sortBy?: string })?.sortBy === 'view_count')).toHaveLength(1);
});

it('picks the is_featured author when author_id is null', async () => {
  const sections: HomepageSection[] = [
    { id: 'about', type: 'about_author', enabled: true, author_id: null },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect((vms[0] as { author: { id: number } }).author.id).toBe(9);
});

it('resolves hero manual refs via getArticlesByIds (no N+1 getArticleById)', async () => {
  const sections: HomepageSection[] = [
    { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false,
      refs: [{ article_id: 11, headline: 'A', route: '/recipes/a' }, { article_id: 22, headline: 'B', route: '/recipes/b' }] },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(getArticlesByIds).toHaveBeenCalledWith(DB, [11, 22], {
    type: 'recipe',
    workflow_status: 'published',
  });
  expect(getArticleById).not.toHaveBeenCalled();
  expect((vms[0] as { recipes: { id: number }[] }).recipes.map((r) => r.id)).toEqual([11, 22]);
});

it('resolves featured manual refs as published recipes', async () => {
  const sections: HomepageSection[] = [
    { id: 'featured', type: 'featured_recipes', enabled: true, title: 'F', subtitle: '',
      source: 'manual', category_slug: null, count: 4,
      refs: [{ article_id: 11, headline: 'A', route: '/recipes/a' }] },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  expect(getArticlesByIds).toHaveBeenCalledWith(DB, [11], {
    type: 'recipe',
    workflow_status: 'published',
  });
});

it('resolves collections manual refs via getArticlesByIds', async () => {
  const sections: HomepageSection[] = [
    { id: 'collections', type: 'collections', enabled: true, title: 'Collections', subtitle: '', refs: [{ roundup_id: 5, title: 'R', route: '/roundups/r' }] },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  expect(getArticlesByIds).toHaveBeenCalledWith(DB, [5], {
    type: 'roundup',
    workflow_status: 'published',
  });
  expect(getArticleById).not.toHaveBeenCalled();
});

it('resolves only complete FAQ items', async () => {
  const sections: HomepageSection[] = [{
    id: 'faq',
    type: 'faq',
    enabled: true,
    title: 'FAQ',
    items: [
      { question: ' Valid? ', answer: ' Yes. ' },
      { question: '', answer: 'Missing question' },
      { question: 'Missing answer', answer: '   ' },
    ],
  }];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms).toEqual([expect.objectContaining({
    kind: 'faq',
    items: [{ question: 'Valid?', answer: 'Yes.' }],
  })]);
});

it('keeps only complete internal quick filters without fetching content', async () => {
  const sections: HomepageSection[] = [{
    id: 'quick_filters',
    type: 'quick_filters',
    enabled: true,
    title: 'Explore recipes',
    filters: [
      { label: ' Quick dinners ', href: ' /recipes?tag=quick ' },
      { label: '   ', href: '/recipes?tag=empty' },
      { label: 'External listing', href: '/articles?tag=wrong' },
    ],
  }];

  const vms = await resolveHomeData(sections, { db: DB, stories: [] });

  expect(vms).toEqual([expect.objectContaining({
    kind: 'quick_filters',
    filters: [{ label: 'Quick dinners', href: '/recipes?tag=quick' }],
  })]);
  expect(getArticles).not.toHaveBeenCalled();
  expect(getArticlesByIds).not.toHaveBeenCalled();
});

it('resolves a complete seasonal spotlight without a media lookup', async () => {
  const sections: HomepageSection[] = [{
    id: 'seasonal_spotlight',
    type: 'seasonal_spotlight',
    enabled: true,
    title: 'Summer cooking',
    body: 'Fresh ideas for warm days.',
    image: {
      media_id: 55,
      alt: 'Seasonal salad',
      placeholder: 'data:image/jpeg;base64,placeholder',
      variants: {
        sm: { r2_key: 'media/salad-sm.webp', width: 720, height: 540 },
        md: { r2_key: 'media/salad-md.webp', width: 1200, height: 900 },
        lg: { r2_key: 'media/salad-lg.webp', width: 2048, height: 1536 },
      },
    },
    cta: { label: 'Browse recipes', href: '/recipes?category=summer' },
  }];

  const vms = await resolveHomeData(sections, { db: DB, stories: [] });

  expect(vms).toEqual([expect.objectContaining({ kind: 'seasonal_spotlight' })]);
  expect(getArticles).not.toHaveBeenCalled();
  expect(getArticlesByIds).not.toHaveBeenCalled();
  expect(getCategories).not.toHaveBeenCalled();
  expect(getAuthors).not.toHaveBeenCalled();
});

it('omits incomplete seasonal spotlights', async () => {
  const sections: HomepageSection[] = [
    {
      id: 'missing-image',
      type: 'seasonal_spotlight',
      enabled: true,
      title: 'Summer cooking',
      body: 'Fresh ideas for warm days.',
      image: null,
      cta: { label: 'Browse recipes', href: '/recipes?category=summer' },
    },
    {
      id: 'missing-cta',
      type: 'seasonal_spotlight',
      enabled: true,
      title: 'Summer cooking',
      body: 'Fresh ideas for warm days.',
      image: {
        media_id: 55,
        alt: 'Seasonal salad',
        placeholder: 'data:image/jpeg;base64,placeholder',
        variants: {
          sm: { r2_key: 'media/salad-sm.webp', width: 720, height: 540 },
          md: { r2_key: 'media/salad-md.webp', width: 1200, height: 900 },
          lg: { r2_key: 'media/salad-lg.webp', width: 2048, height: 1536 },
        },
      },
      cta: { label: '   ', href: '' },
    },
  ];

  const vms = await resolveHomeData(sections, { db: DB, stories: [] });

  expect(vms).toEqual([]);
});

it('trims social proof content and omits invalid items without fetching content', async () => {
  const sections: HomepageSection[] = [{
    id: 'social-proof',
    type: 'social_proof',
    enabled: true,
    eyebrow: ' Trusted by home cooks ',
    title: ' Recipes that work ',
    stats: [
      { value: ' 500+ ', label: ' tested recipes ' },
      { value: ' ', label: 'Missing value' },
    ],
    testimonials: [
      { quote: ' Clear instructions. ', name: ' Maria D. ', role: ' Home cook ' },
      { quote: 'Missing name', name: ' ', role: 'Home cook' },
    ],
    logos: [
      {
        name: ' Featured publication ',
        image: {
          media_id: 55,
          alt: ' Publication logo ',
          placeholder: 'data:image/jpeg;base64,placeholder',
          variants: {
            sm: { r2_key: 'media/logo-sm.webp', width: 720, height: 480 },
            md: { r2_key: 'media/logo-md.webp', width: 1200, height: 800 },
            lg: { r2_key: 'media/logo-lg.webp', width: 2048, height: 1365 },
          },
        },
      },
      { name: 'Incomplete logo', image: null },
    ],
  }];

  const vms = await resolveHomeData(sections, { db: DB, stories: [] });

  expect(vms).toEqual([expect.objectContaining({
    kind: 'social_proof',
    section: expect.objectContaining({
      eyebrow: 'Trusted by home cooks',
      title: 'Recipes that work',
      stats: [{ value: '500+', label: 'tested recipes' }],
      testimonials: [{ quote: 'Clear instructions.', name: 'Maria D.', role: 'Home cook' }],
      logos: [expect.objectContaining({ name: 'Featured publication' })],
    }),
  })]);
  expect(getArticles).not.toHaveBeenCalled();
  expect(getArticlesByIds).not.toHaveBeenCalled();
  expect(getCategories).not.toHaveBeenCalled();
  expect(getAuthors).not.toHaveBeenCalled();
});

it('omits social proof when its title is blank or every item group is invalid', async () => {
  const sections: HomepageSection[] = [
    {
      id: 'blank-title',
      type: 'social_proof',
      enabled: true,
      eyebrow: 'Trusted',
      title: '   ',
      stats: [{ value: '500+', label: 'Recipes' }],
      testimonials: [],
      logos: [],
    },
    {
      id: 'empty-groups',
      type: 'social_proof',
      enabled: true,
      eyebrow: 'Trusted',
      title: 'Recipes that work',
      stats: [{ value: '', label: 'Recipes' }],
      testimonials: [{ quote: 'Helpful', name: '' }],
      logos: [{ name: 'Publication', image: null }],
    },
  ];

  await expect(resolveHomeData(sections, { db: DB, stories: [] })).resolves.toEqual([]);
});

it('resolves a valid mixed social feed from stored snapshots without database calls', async () => {
  const sections: HomepageSection[] = [{
    id: 'social-feed',
    type: 'social_feed',
    enabled: true,
    eyebrow: ' Follow along ',
    title: ' From our kitchen ',
    items: [
      {
        network: 'instagram',
        caption: ' Fresh pasta night ',
        href: ' https://www.instagram.com/p/pasta/ ',
        image: {
          media_id: 71,
          alt: 'Pasta on a plate',
          placeholder: 'data:image/jpeg;base64,placeholder',
          variants: {
            sm: { r2_key: 'media/pasta-sm.webp', width: 720, height: 720 },
            md: { r2_key: 'media/pasta-md.webp', width: 1200, height: 1200 },
            lg: { r2_key: 'media/pasta-lg.webp', width: 2048, height: 2048 },
          },
        },
      },
      {
        network: 'facebook',
        caption: ' Sunday bake ',
        href: 'https://www.facebook.com/example/posts/123',
        image: {
          media_id: 72,
          alt: 'Fresh bread',
          placeholder: 'data:image/jpeg;base64,placeholder',
          variants: {
            sm: { r2_key: 'media/bread-sm.webp', width: 720, height: 540 },
            md: { r2_key: 'media/bread-md.webp', width: 1200, height: 900 },
            lg: { r2_key: 'media/bread-lg.webp', width: 2048, height: 1536 },
          },
        },
      },
      {
        network: 'pinterest',
        caption: ' Summer salad ',
        href: 'https://www.pinterest.com/pin/123',
        image: {
          media_id: 73,
          alt: 'Summer salad',
          placeholder: 'data:image/jpeg;base64,placeholder',
          variants: {
            sm: { r2_key: 'media/salad-sm.webp', width: 720, height: 540 },
            md: { r2_key: 'media/salad-md.webp', width: 1200, height: 900 },
            lg: { r2_key: 'media/salad-lg.webp', width: 2048, height: 1536 },
          },
        },
      },
    ],
  }];

  const vms = await resolveHomeData(sections, { db: DB, stories: [] });

  expect(vms).toEqual([expect.objectContaining({
    kind: 'social_feed',
    section: expect.objectContaining({
      eyebrow: 'Follow along',
      title: 'From our kitchen',
      items: expect.arrayContaining([
        expect.objectContaining({
          network: 'instagram',
          caption: 'Fresh pasta night',
          href: 'https://www.instagram.com/p/pasta/',
        }),
      ]),
    }),
  })]);
  expect(getArticles).not.toHaveBeenCalled();
  expect(getArticlesByIds).not.toHaveBeenCalled();
  expect(getCategories).not.toHaveBeenCalled();
  expect(getAuthors).not.toHaveBeenCalled();
});

it('omits social feeds with incomplete snapshots or unsafe links', async () => {
  const image = {
    media_id: 71,
    alt: 'Pasta on a plate',
    placeholder: 'data:image/jpeg;base64,placeholder',
    variants: {
      sm: { r2_key: 'media/pasta-sm.webp', width: 720, height: 720 },
      md: { r2_key: 'media/pasta-md.webp', width: 1200, height: 1200 },
      lg: { r2_key: 'media/pasta-lg.webp', width: 2048, height: 2048 },
    },
  };
  const sections: HomepageSection[] = [{
    id: 'social-feed',
    type: 'social_feed',
    enabled: true,
    eyebrow: 'Follow along',
    title: 'From our kitchen',
    items: [
      { network: 'instagram', caption: 'Valid post', href: 'https://www.instagram.com/p/pasta/', image },
      { network: 'facebook', caption: 'Unsafe post', href: 'javascript:alert(1)', image },
      { network: 'pinterest', caption: 'Incomplete image', href: 'https://www.pinterest.com/pin/123', image: { ...image, variants: { ...image.variants, lg: { r2_key: '', width: 2048, height: 2048 } } } },
    ],
  }];

  await expect(resolveHomeData(sections, { db: DB, stories: [] })).resolves.toEqual([]);
});

it('omits three social cards when any required variant key is whitespace-only', async () => {
  const image = {
    media_id: 71,
    alt: 'Pasta on a plate',
    placeholder: 'data:image/jpeg;base64,placeholder',
    variants: {
      sm: { r2_key: 'media/pasta-sm.webp', width: 720, height: 720 },
      md: { r2_key: 'media/pasta-md.webp', width: 1200, height: 1200 },
      lg: { r2_key: 'media/pasta-lg.webp', width: 2048, height: 2048 },
    },
  };
  const sections: HomepageSection[] = [{
    id: 'social-feed',
    type: 'social_feed',
    enabled: true,
    eyebrow: 'Follow along',
    title: 'From our kitchen',
    items: [
      {
        network: 'instagram',
        caption: 'Whitespace sm key',
        href: 'https://www.instagram.com/p/pasta/',
        image: { ...image, variants: { ...image.variants, sm: { ...image.variants.sm, r2_key: '   ' } } },
      },
      {
        network: 'facebook',
        caption: 'Whitespace md key',
        href: 'https://www.facebook.com/example/posts/123',
        image: { ...image, variants: { ...image.variants, md: { ...image.variants.md, r2_key: '\t' } } },
      },
      {
        network: 'pinterest',
        caption: 'Whitespace lg key',
        href: 'https://www.pinterest.com/pin/123',
        image: { ...image, variants: { ...image.variants, lg: { ...image.variants.lg, r2_key: '  ' } } },
      },
    ],
  }];

  await expect(resolveHomeData(sections, { db: DB, stories: [] })).resolves.toEqual([]);
});

it('omits a mutated social feed with more than twelve valid cards after filtering', () => {
  const image = {
    media_id: 71,
    alt: 'Pasta on a plate',
    placeholder: 'data:image/jpeg;base64,placeholder',
    variants: {
      sm: { r2_key: 'media/pasta-sm.webp', width: 720, height: 720 },
      md: { r2_key: 'media/pasta-md.webp', width: 1200, height: 1200 },
      lg: { r2_key: 'media/pasta-lg.webp', width: 2048, height: 2048 },
    },
  };
  const section: HomepageSocialFeedSection = {
    id: 'social-feed',
    type: 'social_feed',
    enabled: true,
    eyebrow: 'Follow along',
    title: 'From our kitchen',
    items: Array.from({ length: 13 }, (_, index) => ({
      network: 'instagram',
      caption: `Post ${index + 1}`,
      href: `https://www.instagram.com/p/post-${index + 1}/`,
      image: { ...image, media_id: index + 1 },
    })),
  };

  expect(getRenderableSocialFeed(section)).toBeNull();
});

it('renders responsive social feed source selection for all stored variants', async () => {
  const source = await readFile(new URL('../../components/home/SocialFeed.astro', import.meta.url), 'utf8');

  expect(source).toContain('const smUrl = resolveVariantUrl(image.variants.sm);');
  expect(source).toContain('const mdUrl = resolveVariantUrl(image.variants.md);');
  expect(source).toContain('const lgUrl = resolveVariantUrl(image.variants.lg);');
  expect(source).toContain('srcset={srcSet || undefined}');
  expect(source).toContain('sizes={srcSet ?');
});

it('renders a visible accessible network name on every social feed fallback card', async () => {
  const source = await readFile(new URL('../../components/home/SocialFeed.astro', import.meta.url), 'utf8');

  expect(source).toContain("instagram: 'Instagram'");
  expect(source).toContain("facebook: 'Facebook'");
  expect(source).toContain("pinterest: 'Pinterest'");
  expect(source).toContain('class="social-feed__network"');
  expect(source).toContain('aria-label={`Social network: ${networkName}`}');
  expect(source).toContain('{networkName}');
});

it('dispatches social feed view models to the SSR fallback component', async () => {
  const source = await readFile(new URL('../../components/home/HomeSections.astro', import.meta.url), 'utf8');

  expect(source).toContain("import SocialFeed from './SocialFeed.astro';");
  expect(source).toContain("case 'social_feed':");
  expect(source).toContain('<SocialFeed section={vm.section} />');
});

it('resolves a complete lead magnet with a safe internal CTA without fetching content', async () => {
  const sections: HomepageSection[] = [{
    id: 'lead-magnet',
    type: 'lead_magnet',
    enabled: true,
    eyebrow: ' Free kitchen guide ',
    title: ' Cook with confidence ',
    body: ' Plan dependable weeknight meals. ',
    image: {
      media_id: 61,
      alt: ' Weeknight guide cover ',
      placeholder: 'data:image/jpeg;base64,placeholder',
      variants: {
        sm: { r2_key: 'media/guide-sm.webp', width: 720, height: 540 },
        md: { r2_key: 'media/guide-md.webp', width: 1200, height: 900 },
        lg: { r2_key: 'media/guide-lg.webp', width: 2048, height: 1536 },
      },
    },
    cta: { label: ' Get the guide ', href: ' /guides/weeknight-cooking ' },
  }];

  const vms = await resolveHomeData(sections, { db: DB, stories: [] });

  expect(vms).toEqual([expect.objectContaining({
    kind: 'lead_magnet',
    section: expect.objectContaining({
      eyebrow: 'Free kitchen guide',
      title: 'Cook with confidence',
      body: 'Plan dependable weeknight meals.',
      image: expect.objectContaining({ alt: 'Weeknight guide cover' }),
      cta: { label: 'Get the guide', href: '/guides/weeknight-cooking' },
    }),
  })]);
  expect(getArticles).not.toHaveBeenCalled();
  expect(getArticlesByIds).not.toHaveBeenCalled();
  expect(getCategories).not.toHaveBeenCalled();
  expect(getAuthors).not.toHaveBeenCalled();
});

it('omits lead magnets with incomplete images or unsafe CTAs', async () => {
  const validImage = {
    media_id: 61,
    alt: 'Guide cover',
    placeholder: 'data:image/jpeg;base64,placeholder',
    variants: {
      sm: { r2_key: 'media/guide-sm.webp', width: 720, height: 540 },
      md: { r2_key: 'media/guide-md.webp', width: 1200, height: 900 },
      lg: { r2_key: 'media/guide-lg.webp', width: 2048, height: 1536 },
    },
  };
  const sections: HomepageSection[] = [
    {
      id: 'incomplete-image', type: 'lead_magnet', enabled: true, eyebrow: 'Guide', title: 'Cook better',
      body: 'A practical guide.', image: { ...validImage, variants: { ...validImage.variants, lg: { r2_key: '', width: 2048, height: 1536 } } },
      cta: { label: 'Read guide', href: '/guides/cooking' },
    },
    {
      id: 'unsafe-cta', type: 'lead_magnet', enabled: true, eyebrow: 'Guide', title: 'Cook better',
      body: 'A practical guide.', image: validImage, cta: { label: 'Read guide', href: 'javascript:alert(1)' },
    },
    {
      id: 'unsafe-backslash-path', type: 'lead_magnet', enabled: true, eyebrow: 'Guide', title: 'Cook better',
      body: 'A practical guide.', image: validImage, cta: { label: 'Read guide', href: '/\\evil.example' },
    },
    {
      id: 'safe-https', type: 'lead_magnet', enabled: true, eyebrow: 'Guide', title: 'Cook better',
      body: 'A practical guide.', image: validImage, cta: { label: 'Read guide', href: 'https://example.com/guide' },
    },
  ];

  const vms = await resolveHomeData(sections, { db: DB, stories: [] });

  expect(vms).toEqual([expect.objectContaining({
    kind: 'lead_magnet',
    section: expect.objectContaining({ cta: { href: 'https://example.com/guide', label: 'Read guide' } }),
  })]);
});

it('identifies uppercase HTTPS CTAs as external while keeping internal paths local', () => {
  expect(isExternalHomepageCtaHref('HTTPS://example.com/guide')).toBe(true);
  expect(isExternalHomepageCtaHref('/guides/weeknight-cooking')).toBe(false);
});

it('uses URL-based HTTPS classification for LeadMagnet link attributes', async () => {
  const source = await readFile(new URL('../../components/home/LeadMagnet.astro', import.meta.url), 'utf8');

  expect(source).toContain("import { isExternalHomepageCtaHref } from '@site/utils/homepage-cta';");
  expect(source).toContain('const isExternalCta = isExternalHomepageCtaHref(section.cta.href);');
  expect(source).toContain("target={isExternalCta ? '_blank' : undefined}");
  expect(source).toContain("rel={isExternalCta ? 'noopener noreferrer' : undefined}");
});

it('resolves P3C sections without a media-loader dependency', async () => {
  const sections: HomepageSection[] = [
    {
      id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return',
      stats: [{ value: '4.9', label: 'Average rating' }], testimonials: [], logos: [],
    },
    {
      id: 'lead-magnet', type: 'lead_magnet', enabled: true, eyebrow: 'Free guide', title: 'Cook better',
      body: 'A practical guide.', image: {
        media_id: 61,
        alt: 'Guide cover',
        placeholder: 'data:image/jpeg;base64,placeholder',
        variants: {
          sm: { r2_key: 'media/guide-sm.webp', width: 720, height: 540 },
          md: { r2_key: 'media/guide-md.webp', width: 1200, height: 900 },
          lg: { r2_key: 'media/guide-lg.webp', width: 2048, height: 1536 },
        },
      },
      cta: { label: 'Read guide', href: '/guides/cooking' },
    },
  ];

  await expect(resolveHomeData(sections, { db: DB, stories: [] })).resolves.toEqual([
    expect.objectContaining({ kind: 'social_proof' }),
    expect.objectContaining({ kind: 'lead_magnet' }),
  ]);
});

describe('resolveHomeData — hero fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to distinct trending vs latest responses so tests can distinguish them.
    getArticles.mockImplementation(async (_db: unknown, opts?: { sortBy?: string }) => {
      if (opts?.sortBy === 'view_count') {
        return { items: [{ id: 100, slug: 'trend', type: 'recipe', headline: 'Trend' }], total: 1 };
      }
      return { items: [{ id: 1, slug: 'latest', type: 'recipe', headline: 'Latest' }], total: 1 };
    });
  });

  it('uses trending (view_count desc) when hero has no refs', async () => {
    const sections: HomepageSection[] = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
    ];
    const vms = await resolveHomeData(sections, { db: DB, stories: [] });
    const hero = vms.find((v) => v.kind === 'hero') as { recipes: { id: number }[] } | undefined;
    expect(hero).toBeDefined();
    expect(hero!.recipes[0].id).toBe(100); // trending, not latest
    expect(getArticles).toHaveBeenCalledWith(DB, expect.objectContaining({ sortBy: 'view_count' }));
  });

  it('returns empty recipes (no trending) when hero refs are all dead', async () => {
    getArticlesByIds.mockResolvedValue([]); // all refs soft-deleted
    const sections: HomepageSection[] = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false,
        refs: [{ article_id: 7, headline: 'gone', route: '/recipes/gone' }] },
    ];
    const vms = await resolveHomeData(sections, { db: DB, stories: [] });
    const hero = vms.find((v) => v.kind === 'hero') as { recipes: unknown[] } | undefined;
    expect(hero).toBeDefined();
    expect(hero!.recipes).toEqual([]);
    expect(getArticles).not.toHaveBeenCalledWith(DB, expect.objectContaining({ sortBy: 'view_count' }));
  });

  it('caches trending so two hero-fallback sections do one DB call', async () => {
    getArticles.mockResolvedValue({ items: [{ id: 9, slug: 't', type: 'recipe', headline: 'T' }], total: 1 });
    await resolveHomeData(
      [
        { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
        { id: 'hero2', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
      ],
      { db: DB, stories: [] },
    );
    const trendingCalls = (getArticles as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .filter((c) => (c[1] as { sortBy?: string })?.sortBy === 'view_count');
    expect(trendingCalls).toHaveLength(1);
  });
});
