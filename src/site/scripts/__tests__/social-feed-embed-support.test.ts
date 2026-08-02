import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectSocialFeedNetworks,
  isSupportedSocialFeedNetwork,
  SOCIAL_FEED_CONSENT_KEY,
  SOCIAL_FEED_PROVIDER_SOURCES,
} from '../social-feed-embed-support';

type FakeListener = () => void;

class FakeNode {
  readonly attributes = new Map<string, string>();
  readonly children: FakeNode[] = [];
  readonly dataset: Record<string, string | undefined> = {};
  readonly listeners = new Map<string, Set<FakeListener>>();
  hidden = false;
  disabled = false;
  async = false;
  src = '';
  tagName: string;

  constructor(tagName = 'div') {
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name.startsWith('data-')) {
      const datasetName = name.slice(5).replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      this.dataset[datasetName] = value;
    }
  }

  addEventListener(type: string, listener: FakeListener): void {
    const listeners = this.listeners.get(type) ?? new Set<FakeListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  dispatch(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }

  append(...nodes: FakeNode[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: FakeNode[]): void {
    this.children.splice(0, this.children.length, ...nodes);
  }

  querySelector<T extends FakeNode>(selector: string): T | null {
    return this.querySelectorAll<T>(selector)[0] ?? null;
  }

  querySelectorAll<T extends FakeNode>(selector: string): T[] {
    const matches: FakeNode[] = [];
    const visit = (node: FakeNode): void => {
      node.children.forEach((child) => {
        const isAttributeSelector = selector.startsWith('[') && selector.endsWith(']');
        const matchesSelector = isAttributeSelector
          ? child.attributes.has(selector.slice(1, -1))
          : child.tagName.toLowerCase() === selector.toLowerCase();
        if (matchesSelector) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches as T[];
  }
}

class FakeMutationObserver {
  private static readonly instances = new Set<FakeMutationObserver>();
  private observed = false;

  constructor(private readonly callback: () => void) {
    FakeMutationObserver.instances.add(this);
  }

  observe(): void {
    this.observed = true;
  }

  disconnect(): void {
    this.observed = false;
    FakeMutationObserver.instances.delete(this);
  }

  static flush(): void {
    FakeMutationObserver.instances.forEach((observer) => {
      if (observer.observed) observer.callback();
    });
  }

  static reset(): void {
    FakeMutationObserver.instances.clear();
  }
}

class FakeDocument extends FakeNode {
  readonly head = new FakeNode('head');
  readonly scripts: FakeNode[] = [];
  readonly readyState = 'complete';

  constructor(root: FakeNode) {
    super('#document');
    this.append(root);
    const appendHeadNode = this.head.append.bind(this.head);
    this.head.append = (...nodes: FakeNode[]) => {
      this.scripts.push(...nodes);
      appendHeadNode(...nodes);
    };
  }

  createElement(tagName: string): FakeNode {
    return new FakeNode(tagName);
  }
}

class FakeSessionStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const createHarness = (networks: string[]) => {
  const root = new FakeNode('section');
  root.setAttribute('data-social-feed', '');
  const cards = networks.map((network, index) => {
    const card = new FakeNode('li');
    card.setAttribute('data-social-feed-card', '');
    card.setAttribute('data-social-network', network);
    card.setAttribute('data-social-post-href', `https://example.com/${network}/${index}`);

    const fallback = new FakeNode('a');
    fallback.setAttribute('data-social-feed-fallback', '');
    const mount = new FakeNode('div');
    mount.setAttribute('data-social-feed-mount', '');
    mount.hidden = true;
    card.append(fallback, mount);
    root.append(card);
    return { card, fallback, mount };
  });
  const consent = new FakeNode('button');
  consent.setAttribute('data-social-feed-consent', '');
  root.append(consent);

  const document = new FakeDocument(root);
  const sessionStorage = new FakeSessionStorage();
  const providers = {
    instagramProcess: vi.fn(),
    facebookParse: vi.fn(),
    pinterestBuild: vi.fn(),
  };
  const window = {
    instgrm: { Embeds: { process: providers.instagramProcess } },
    FB: { XFBML: { parse: providers.facebookParse } },
    PinUtils: { build: providers.pinterestBuild },
  };

  return { cards, consent, document, providers, root, sessionStorage, window };
};

const loadSocialFeedEmbeds = async (harness: ReturnType<typeof createHarness>): Promise<void> => {
  vi.stubGlobal('document', harness.document);
  vi.stubGlobal('sessionStorage', harness.sessionStorage);
  vi.stubGlobal('window', harness.window);
  vi.stubGlobal('MutationObserver', FakeMutationObserver);
  vi.resetModules();
  await import('../social-feed-embeds');
};

const settleEmbedHydration = async (): Promise<void> => {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
};

afterEach(() => {
  FakeMutationObserver.reset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('social feed embed support', () => {
  it('collects each supported network once in first-seen order', () => {
    expect(collectSocialFeedNetworks([
      'instagram',
      'pinterest',
      'instagram',
      'unsupported',
      'facebook',
      'pinterest',
    ])).toEqual(['instagram', 'pinterest', 'facebook']);
  });

  it('accepts only the exact supported network values', () => {
    expect(isSupportedSocialFeedNetwork('instagram')).toBe(true);
    expect(isSupportedSocialFeedNetwork('facebook')).toBe(true);
    expect(isSupportedSocialFeedNetwork('pinterest')).toBe(true);
    expect(isSupportedSocialFeedNetwork('Instagram')).toBe(false);
    expect(isSupportedSocialFeedNetwork('twitter')).toBe(false);
  });

  it('uses the session consent key and official provider sources', () => {
    expect(SOCIAL_FEED_CONSENT_KEY).toBe('homepage-social-feed-consent');
    expect(SOCIAL_FEED_PROVIDER_SOURCES.instagram).toBe('https://www.instagram.com/embed.js');
    expect(SOCIAL_FEED_PROVIDER_SOURCES.pinterest).toBe('https://assets.pinterest.com/js/pinit.js');
  });
});

describe('social feed SSR boundary', () => {
  it('keeps provider URLs and session storage out of the fallback component', async () => {
    const source = await readFile(new URL('../../components/home/SocialFeed.astro', import.meta.url), 'utf8');

    expect(source).not.toContain('https://www.instagram.com/embed.js');
    expect(source).not.toContain('https://connect.facebook.net/en_US/sdk.js');
    expect(source).not.toContain('https://assets.pinterest.com/js/pinit.js');
    expect(source).not.toContain('sessionStorage');
  });

  it('imports the browser embed module once from the home sections component', async () => {
    const source = await readFile(new URL('../../components/home/HomeSections.astro', import.meta.url), 'utf8');
    const matches = source.match(/import '@site\/scripts\/social-feed-embeds';/g) ?? [];

    expect(matches).toHaveLength(1);
  });

  it('renders the social-feed root attribute consumed by the browser module', async () => {
    const source = await readFile(new URL('../../components/home/SocialFeed.astro', import.meta.url), 'utf8');

    expect(source).toContain('<section class="social-feed" data-social-feed');
  });

  it('reserves the provider mount ratio from the SSR image snapshot', async () => {
    const source = await readFile(new URL('../../components/home/SocialFeed.astro', import.meta.url), 'utf8');

    expect(source).toContain('style={`--social-feed-mount-ratio: ${image.variants.md.width} / ${image.variants.md.height};`}');
    expect(source).toContain('aspect-ratio: var(--social-feed-mount-ratio);');
  });

  it('forces hidden provider mounts to remain out of layout', async () => {
    const source = await readFile(new URL('../../components/home/SocialFeed.astro', import.meta.url), 'utf8');

    expect(source).toContain(`.social-feed__grid [data-social-feed-mount][hidden] {
    display: none;
  }`);
  });
});

describe('social feed embed DOM lifecycle', () => {
  it('does not append provider scripts before consent', async () => {
    const harness = createHarness(['instagram', 'facebook']);

    await loadSocialFeedEmbeds(harness);

    expect(harness.document.scripts).toHaveLength(0);
    harness.cards.forEach(({ fallback, mount }) => {
      expect(fallback.hidden).toBe(false);
      expect(mount.hidden).toBe(true);
      expect(mount.children).toHaveLength(0);
    });
  });

  it('finds the social-feed root and attaches its consent handler', async () => {
    const harness = createHarness(['instagram']);

    await loadSocialFeedEmbeds(harness);
    harness.consent.dispatch('click');

    expect(harness.sessionStorage.getItem(SOCIAL_FEED_CONSENT_KEY)).toBe('granted');
    expect(harness.document.scripts).toHaveLength(1);
  });

  it.each([
    ['instagram', 'https://www.instagram.com/embed/captioned/'],
    ['facebook', 'https://www.facebook.com/plugins/post.php?href=example'],
    ['pinterest', 'https://assets.pinterest.com/ext/embed.html?id=123'],
  ])('reveals a %s card only after provider-rendered DOM appears', async (network, renderedSrc) => {
    const harness = createHarness([network]);
    harness.sessionStorage.setItem(SOCIAL_FEED_CONSENT_KEY, 'granted');

    await loadSocialFeedEmbeds(harness);

    expect(harness.document.scripts).toHaveLength(1);
    expect(harness.cards[0]?.fallback.hidden).toBe(false);
    expect(harness.cards[0]?.mount.hidden).toBe(true);
    expect(harness.cards[0]?.mount.children).toHaveLength(1);

    harness.document.scripts[0]?.dispatch('load');
    await settleEmbedHydration();

    expect(harness.cards[0]?.fallback.hidden).toBe(false);
    expect(harness.cards[0]?.mount.hidden).toBe(true);

    const renderedFrame = new FakeNode('iframe');
    renderedFrame.src = renderedSrc;
    harness.cards[0]?.mount.append(renderedFrame);
    FakeMutationObserver.flush();
    await settleEmbedHydration();

    expect(harness.cards[0]?.fallback.hidden).toBe(true);
    expect(harness.cards[0]?.mount.hidden).toBe(false);
  });

  it('reveals successful cards independently and restores timed-out cards to fallback', async () => {
    vi.useFakeTimers();
    const harness = createHarness(['instagram', 'instagram']);

    await loadSocialFeedEmbeds(harness);
    harness.consent.dispatch('click');
    harness.document.scripts[0]?.dispatch('load');
    await settleEmbedHydration();

    const renderedFrame = new FakeNode('iframe');
    renderedFrame.src = 'https://www.instagram.com/embed/captioned/';
    harness.cards[0]?.mount.append(renderedFrame);
    FakeMutationObserver.flush();
    await settleEmbedHydration();

    expect(harness.cards[0]?.fallback.hidden).toBe(true);
    expect(harness.cards[0]?.mount.hidden).toBe(false);
    expect(harness.cards[1]?.fallback.hidden).toBe(false);
    expect(harness.cards[1]?.mount.hidden).toBe(true);

    await vi.advanceTimersByTimeAsync(15_000);

    expect(harness.cards[1]?.fallback.hidden).toBe(false);
    expect(harness.cards[1]?.mount.hidden).toBe(true);
    expect(harness.cards[1]?.mount.children).toHaveLength(0);
  });

  it('loads one provider script per network and initializes each network once after repeated clicks', async () => {
    const harness = createHarness(['instagram', 'instagram', 'facebook', 'pinterest']);

    await loadSocialFeedEmbeds(harness);
    harness.consent.dispatch('click');
    harness.consent.dispatch('click');

    expect(harness.document.scripts.map((script) => script.src)).toEqual([
      'https://www.instagram.com/embed.js',
      'https://connect.facebook.net/en_US/sdk.js',
      'https://assets.pinterest.com/js/pinit.js',
    ]);
    expect(harness.consent.disabled).toBe(true);

    harness.document.scripts.forEach((script) => script.dispatch('load'));
    await settleEmbedHydration();
    harness.consent.dispatch('click');
    await settleEmbedHydration();

    expect(harness.providers.instagramProcess).toHaveBeenCalledTimes(1);
    expect(harness.providers.facebookParse).toHaveBeenCalledTimes(1);
    expect(harness.providers.pinterestBuild).toHaveBeenCalledTimes(1);
  });

  it('keeps the fallback visible and mount hidden when a provider script fails', async () => {
    const harness = createHarness(['facebook']);

    await loadSocialFeedEmbeds(harness);
    harness.consent.dispatch('click');
    harness.document.scripts[0]?.dispatch('error');
    await settleEmbedHydration();

    expect(harness.cards[0]?.fallback.hidden).toBe(false);
    expect(harness.cards[0]?.mount.hidden).toBe(true);
    expect(harness.cards[0]?.mount.children).toHaveLength(0);
  });

  it('keeps the fallback visible and mount hidden when provider initialization fails', async () => {
    const harness = createHarness(['pinterest']);
    harness.providers.pinterestBuild.mockImplementation(() => {
      throw new Error('provider unavailable');
    });

    await loadSocialFeedEmbeds(harness);
    harness.consent.dispatch('click');
    harness.document.scripts[0]?.dispatch('load');
    await settleEmbedHydration();

    expect(harness.cards[0]?.fallback.hidden).toBe(false);
    expect(harness.cards[0]?.mount.hidden).toBe(true);
    expect(harness.cards[0]?.mount.children).toHaveLength(0);
  });
});
