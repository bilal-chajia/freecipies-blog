import type {
  OrganizationProfileSettings,
  PublicSocialLink,
  SiteIdentitySettings,
} from '@modules/settings/types/settings.types';

export interface HomeJsonLdInput {
  identity: SiteIdentitySettings;
  organization: OrganizationProfileSettings;
  socialLinks: PublicSocialLink[];
  /** Absolute URL template containing the literal `{search_term_string}`. */
  searchUrlTemplate: string;
}

type JsonLdNode = Record<string, unknown> & { '@type': string };

/** Build homepage JSON-LD: a WebSite (+ SearchAction) node and an Organization node. */
export function buildHomeJsonLd(input: HomeJsonLdInput): JsonLdNode[] {
  const { identity, organization, socialLinks, searchUrlTemplate } = input;

  const website: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: identity.site_name,
    url: identity.site_url,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: searchUrlTemplate },
      'query-input': 'required name=search_term_string',
    },
  };

  const sameAs = [...organization.same_as, ...socialLinks.map((l) => l.url)].filter(
    (url, index, arr) => Boolean(url) && arr.indexOf(url) === index,
  );

  const org: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organization.name,
    url: organization.url,
    logo: organization.logo_url,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return [website, org];
}
