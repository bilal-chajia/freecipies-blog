import type {
  OrganizationProfileSettings,
  PublicSocialLink,
  SiteIdentitySettings,
  HomepageFaqItem,
} from '@modules/settings/types/settings.types';

export interface HomeJsonLdRecipe {
  id: number;
  name: string;
  url: string;
}

export interface HomeJsonLdInput {
  identity: SiteIdentitySettings;
  organization: OrganizationProfileSettings;
  socialLinks: PublicSocialLink[];
  /** Absolute URL template containing the literal `{search_term_string}`. */
  searchUrlTemplate: string;
  recipes?: HomeJsonLdRecipe[];
  faqItems?: HomepageFaqItem[];
}

export type JsonLdNode = Record<string, unknown> & { '@type': string };

export function serializeJsonLd(node: JsonLdNode): string {
  return JSON.stringify(node).replace(/</g, '\\u003c');
}

/** Build homepage JSON-LD: a WebSite (+ SearchAction) node and an Organization node. */
export function buildHomeJsonLd(input: HomeJsonLdInput): JsonLdNode[] {
  const {
    identity,
    organization,
    socialLinks,
    searchUrlTemplate,
    recipes = [],
    faqItems = [],
  } = input;

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

  const nodes = [website, org];

  const seenRecipes = new Set<string>();
  const itemListElement = recipes.flatMap((recipe) => {
    const url = new URL(recipe.url, identity.site_url).toString();
    const identityKey = recipe.id > 0 ? `id:${recipe.id}` : `url:${url}`;
    if (seenRecipes.has(identityKey)) return [];
    seenRecipes.add(identityKey);

    return [{
      '@type': 'ListItem',
      position: seenRecipes.size,
      name: recipe.name,
      url,
    }];
  });

  if (itemListElement.length > 0) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement,
    });
  }

  if (faqItems.length > 0) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    });
  }

  return nodes;
}
