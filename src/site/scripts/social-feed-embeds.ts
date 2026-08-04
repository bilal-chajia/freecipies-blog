import {
  collectSocialFeedNetworks,
  isSupportedSocialFeedNetwork,
  SOCIAL_FEED_CONSENT_KEY,
  SOCIAL_FEED_PROVIDER_SOURCES,
  type HomepageSocialNetwork,
} from './social-feed-embed-support';

const SOCIAL_FEED_SELECTOR = '[data-social-feed]';
const SOCIAL_FEED_CARD_SELECTOR = '[data-social-feed-card]';
const SOCIAL_FEED_FALLBACK_SELECTOR = '[data-social-feed-fallback]';
const SOCIAL_FEED_MOUNT_SELECTOR = '[data-social-feed-mount]';
const SOCIAL_FEED_CONSENT_SELECTOR = '[data-social-feed-consent]';
const SOCIAL_FEED_RENDER_TIMEOUT_MS = 10_000;
const SOCIAL_FEED_SCRIPT_TIMEOUT_MS = 10_000;

const providerLoads = new Map<HomepageSocialNetwork, Promise<void>>();
const sectionHydrations = new WeakMap<HTMLElement, Promise<void>>();

interface SocialFeedCard extends HTMLElement {
  dataset: DOMStringMap & {
    socialNetwork?: string;
    socialPostHref?: string;
  };
}

interface SocialFeedProviderWindow extends Window {
  FB?: {
    XFBML?: {
      parse: (element?: Element) => void;
    };
  };
  PinUtils?: {
    build: () => void;
  };
  instgrm?: {
    Embeds?: {
      process: () => void;
    };
  };
}

const getProviderWindow = (): SocialFeedProviderWindow => window;

const loadSocialFeedProvider = (network: HomepageSocialNetwork): Promise<void> => {
  const existingLoad = providerLoads.get(network);
  if (existingLoad) return existingLoad;

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out loading ${network} embeds.`));
    }, SOCIAL_FEED_SCRIPT_TIMEOUT_MS);
    const resolveLoad = (): void => {
      clearTimeout(timeoutId);
      resolve();
    };
    const rejectLoad = (): void => {
      clearTimeout(timeoutId);
      reject(new Error(`Unable to load ${network} embeds.`));
    };

    script.src = SOCIAL_FEED_PROVIDER_SOURCES[network];
    script.async = true;
    script.addEventListener('load', resolveLoad, { once: true });
    script.addEventListener('error', rejectLoad, { once: true });
    document.head.append(script);
  });

  providerLoads.set(network, load);
  return load;
};

const buildProviderElement = (network: HomepageSocialNetwork, href: string): HTMLElement => {
  if (network === 'instagram') {
    const embed = document.createElement('blockquote');
    embed.setAttribute('class', 'instagram-media');
    embed.setAttribute('data-instgrm-permalink', href);
    embed.setAttribute('data-instgrm-version', '14');
    return embed;
  }

  if (network === 'facebook') {
    const embed = document.createElement('div');
    embed.setAttribute('class', 'fb-post');
    embed.setAttribute('data-href', href);
    embed.setAttribute('data-show-text', 'false');
    return embed;
  }

  const embed = document.createElement('a');
  embed.setAttribute('data-pin-do', 'embedPin');
  embed.setAttribute('href', href);
  return embed;
};

const initializeProvider = (network: HomepageSocialNetwork, root: HTMLElement): void => {
  const providerWindow = getProviderWindow();

  if (network === 'instagram') {
    if (!providerWindow.instgrm?.Embeds) throw new Error('Instagram embeds are unavailable.');
    providerWindow.instgrm.Embeds.process();
    return;
  }

  if (network === 'facebook') {
    if (!providerWindow.FB?.XFBML) throw new Error('Facebook embeds are unavailable.');
    providerWindow.FB.XFBML.parse(root);
    return;
  }

  if (!providerWindow.PinUtils) throw new Error('Pinterest embeds are unavailable.');
  providerWindow.PinUtils.build();
};

const getCardsForNetwork = (
  root: HTMLElement,
  network: HomepageSocialNetwork,
): SocialFeedCard[] => Array.from(root.querySelectorAll<SocialFeedCard>(SOCIAL_FEED_CARD_SELECTOR))
  .filter((card) => card.dataset.socialNetwork === network);

const showFallback = (card: SocialFeedCard): void => {
  const fallback = card.querySelector<HTMLElement>(SOCIAL_FEED_FALLBACK_SELECTOR);
  const mount = card.querySelector<HTMLElement>(SOCIAL_FEED_MOUNT_SELECTOR);

  if (mount) {
    mount.replaceChildren();
    mount.hidden = true;
  }
  if (fallback) fallback.hidden = false;
};

const showEmbed = (card: SocialFeedCard): void => {
  const fallback = card.querySelector<HTMLElement>(SOCIAL_FEED_FALLBACK_SELECTOR);
  const mount = card.querySelector<HTMLElement>(SOCIAL_FEED_MOUNT_SELECTOR);

  if (fallback) fallback.hidden = true;
  if (mount) mount.hidden = false;
};

const matchesProviderFrame = (network: HomepageSocialNetwork, frame: HTMLIFrameElement): boolean => {
  try {
    const url = new URL(frame.src);

    if (network === 'instagram') {
      return (url.hostname === 'instagram.com' || url.hostname.endsWith('.instagram.com'))
        && url.pathname.includes('/embed');
    }

    if (network === 'facebook') {
      return (url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com'))
        && url.pathname.startsWith('/plugins/post');
    }

    return url.hostname === 'assets.pinterest.com' && url.pathname.startsWith('/ext/embed');
  } catch {
    return false;
  }
};

const findProviderFrame = (
  network: HomepageSocialNetwork,
  mount: HTMLElement,
): HTMLIFrameElement | null => Array.from(mount.querySelectorAll<HTMLIFrameElement>('iframe'))
  .find((frame) => matchesProviderFrame(network, frame)) ?? null;

const waitForProviderMarkup = (
  network: HomepageSocialNetwork,
  mount: HTMLElement,
): Promise<boolean> => new Promise((resolve) => {
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let observer: MutationObserver | undefined;
  let observedFrame: HTMLIFrameElement | null = null;
  const finish = (rendered: boolean): void => {
    if (settled) return;
    settled = true;
    observer?.disconnect();
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    resolve(rendered);
  };

  const observeProviderFrame = (): void => {
    const frame = findProviderFrame(network, mount);
    if (!frame || frame === observedFrame) return;

    observedFrame = frame;
    frame.addEventListener('load', () => finish(true), { once: true });
    frame.addEventListener('error', () => finish(false), { once: true });
  };

  observer = new MutationObserver(observeProviderFrame);
  observer.observe(mount, { childList: true, subtree: true, attributes: true });
  observeProviderFrame();
  timeoutId = setTimeout(() => finish(false), SOCIAL_FEED_RENDER_TIMEOUT_MS);
});

const hydrateNetwork = async (root: HTMLElement, network: HomepageSocialNetwork): Promise<void> => {
  const cards = getCardsForNetwork(root, network);
  const preparedCards = cards.flatMap((card) => {
    const href = card.dataset.socialPostHref;
    const mount = card.querySelector<HTMLElement>(SOCIAL_FEED_MOUNT_SELECTOR);

    if (!href || !mount) {
      showFallback(card);
      return [];
    }

    mount.replaceChildren(buildProviderElement(network, href));
    return [{ card, mount }];
  });

  if (preparedCards.length === 0) return;

  try {
    await loadSocialFeedProvider(network);
    initializeProvider(network, root);
    await Promise.all(preparedCards.map(async ({ card, mount }) => {
      if (await waitForProviderMarkup(network, mount)) {
        showEmbed(card);
      } else {
        showFallback(card);
      }
    }));
  } catch {
    preparedCards.forEach(({ card }) => showFallback(card));
  }
};

const hydrateSocialFeed = async (root: HTMLElement): Promise<void> => {
  const existingHydration = sectionHydrations.get(root);
  if (existingHydration) return existingHydration;

  const hydration = hydrateSocialFeedOnce(root);
  sectionHydrations.set(root, hydration);
  return hydration;
};

const hydrateSocialFeedOnce = async (root: HTMLElement): Promise<void> => {
  const networks = collectSocialFeedNetworks(
    Array.from(root.querySelectorAll<SocialFeedCard>(SOCIAL_FEED_CARD_SELECTOR), (card) => card.dataset.socialNetwork),
  );

  await Promise.all(networks.map((network) => hydrateNetwork(root, network)));
};

const initSocialFeedEmbeds = (): void => {
  const root = document.querySelector<HTMLElement>(SOCIAL_FEED_SELECTOR);
  if (!root) return;

  const consentButton = root.querySelector<HTMLButtonElement>(SOCIAL_FEED_CONSENT_SELECTOR);
  const startHydration = (): void => {
    if (consentButton) {
      consentButton.disabled = true;
      consentButton.setAttribute('aria-disabled', 'true');
    }
    void hydrateSocialFeed(root);
  };

  consentButton?.addEventListener('click', () => {
    sessionStorage.setItem(SOCIAL_FEED_CONSENT_KEY, 'granted');
    startHydration();
  });

  if (sessionStorage.getItem(SOCIAL_FEED_CONSENT_KEY) === 'granted') {
    startHydration();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSocialFeedEmbeds, { once: true });
} else {
  initSocialFeedEmbeds();
}
