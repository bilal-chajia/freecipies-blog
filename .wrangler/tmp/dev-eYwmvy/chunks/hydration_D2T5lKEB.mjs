globalThis.process ??= {}; globalThis.process.env ??= {};
function safeParseJson(json) {
  if (!json) return null;
  try {
    return typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return null;
  }
}
function extractImage(imagesJson, slot = "thumbnail") {
  const images = safeParseJson(imagesJson);
  if (!images) return {};
  const imageSlot = images[slot];
  if (!imageSlot?.variants) return {};
  const variant = imageSlot.variants.lg || imageSlot.variants.md || imageSlot.variants.sm || imageSlot.variants.original || imageSlot.variants.xs;
  if (!variant) return {};
  return {
    imageUrl: variant.url,
    imageAlt: imageSlot.alt,
    imageWidth: variant.width,
    imageHeight: variant.height
  };
}
function extractSeo(seoJson) {
  const seo = safeParseJson(seoJson);
  if (!seo) return {};
  return {
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    ogImage: seo.ogImage,
    canonical: seo.canonical ?? void 0
  };
}
function extractRecipe(recipeJson) {
  return safeParseJson(recipeJson);
}
function extractTagStyle(styleJson) {
  const style = safeParseJson(styleJson);
  if (!style) return {};
  return {
    color: style.color,
    icon: style.icon,
    backgroundColor: style.backgroundColor
  };
}
function hydrateArticle(article) {
  const image = extractImage(article.imagesJson);
  const seo = extractSeo(article.seoJson);
  const recipe = extractRecipe(article.recipeJson);
  const route = article.type === "recipe" ? `/recipes/${article.slug}` : `/articles/${article.slug}`;
  return {
    ...article,
    ...image,
    ...seo,
    recipeJson: recipe,
    // Replace string with parsed object for template access
    recipe,
    // Also available as recipe for clarity
    label: article.headline,
    // Alias for template compatibility
    route
  };
}
function hydrateCategory(category) {
  const image = extractImage(category.imagesJson);
  const seo = extractSeo(category.seoJson);
  return {
    ...category,
    ...image,
    ...seo,
    route: `/categories/${category.slug}`
  };
}
function hydrateAuthor(author) {
  const image = extractImage(author.imagesJson, "avatar");
  const seo = extractSeo(author.seoJson);
  return {
    ...author,
    ...image,
    ...seo,
    job: author.jobTitle,
    // Alias for template compatibility
    route: `/authors/${author.slug}`
  };
}
function hydrateTag(tag) {
  const style = extractTagStyle(tag.styleJson);
  return {
    ...tag,
    ...style,
    route: `/tags/${tag.slug}`
  };
}
function hydrateArticles(articles) {
  return articles.map(hydrateArticle);
}
function hydrateCategories(categories) {
  return categories.map(hydrateCategory);
}
function hydrateTags(tags) {
  return tags.map(hydrateTag);
}

export { hydrateCategory as a, hydrateArticle as b, hydrateArticles as c, hydrateCategories as d, hydrateTags as e, hydrateTag as f, hydrateAuthor as h };
