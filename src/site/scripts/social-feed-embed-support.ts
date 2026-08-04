import type { HomepageSocialNetwork } from '@modules/settings/types/settings.types';

export type { HomepageSocialNetwork } from '@modules/settings/types/settings.types';

export const SOCIAL_FEED_CONSENT_KEY = 'homepage-social-feed-consent';

export const SOCIAL_FEED_PROVIDER_SOURCES = {
  instagram: 'https://www.instagram.com/embed.js',
  facebook: 'https://connect.facebook.net/en_US/sdk.js',
  pinterest: 'https://assets.pinterest.com/js/pinit.js',
} as const;

export const isSupportedSocialFeedNetwork = (
  network: string,
): network is HomepageSocialNetwork =>
  network === 'instagram' || network === 'facebook' || network === 'pinterest';

export const collectSocialFeedNetworks = (
  networks: Iterable<string | null | undefined>,
): HomepageSocialNetwork[] => {
  const uniqueNetworks = new Set<HomepageSocialNetwork>();

  for (const network of networks) {
    if (network && isSupportedSocialFeedNetwork(network)) {
      uniqueNetworks.add(network);
    }
  }

  return [...uniqueNetworks];
};
