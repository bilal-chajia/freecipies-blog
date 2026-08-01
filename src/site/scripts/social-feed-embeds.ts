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
    script.src = SOCIAL_FEED_PROVIDER_SOURCES[network];
    script.async = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load ${network} embeds.`)), { once: true });
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

const hydrateNetwork = async (root: HTMLElement, network: HomepageSocialNetwork): Promise<void> => {
  const cards = getCardsForNetwork(root, network);

  try {
    for (const card of cards) {
      const href = card.dataset.socialPostHref;
      const mount = card.querySelector<HTMLElement>(SOCIAL_FEED_MOUNT_SELECTOR);
      if (!href || !mount) throw new Error(`Invalid ${network} social feed card.`);

      mount.replaceChildren(buildProviderElement(network, href));
    }

    await loadSocialFeedProvider(network);
    initializeProvider(network, root);
    cards.forEach(showEmbed);
  } catch {
    cards.forEach(showFallback);
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
