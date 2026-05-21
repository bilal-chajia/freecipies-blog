import { useState } from 'react';
import {
  parseVariantsJson,
  getVariantMap,
  getVariantForContainer,
  resolveVariantUrl
} from '@shared/types/images';
import type { MediaLibraryItem } from '../utils/mediaHelpers';

interface OptimizedImageProps {
  item: MediaLibraryItem;
  className?: string;
  priority?: boolean;
}

export const OptimizedImage = ({ item, className = "", priority = false }: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const parsed = parseVariantsJson(item);
  const placeholder = parsed?.placeholder;
  const variants = getVariantMap(parsed);

  // Build srcset from available variants
  let srcset = '';
  let src = item.url || '';
  let width: number | undefined = undefined;
  let height: number | undefined = undefined;

  if (variants) {
    const srcsetParts: string[] = [];
    if (variants.xs) srcsetParts.push(`${resolveVariantUrl(variants.xs)} ${variants.xs.width}w`);
    if (variants.sm) srcsetParts.push(`${resolveVariantUrl(variants.sm)} ${variants.sm.width}w`);
    if (variants.md) srcsetParts.push(`${resolveVariantUrl(variants.md)} ${variants.md.width}w`);
    if (variants.lg) srcsetParts.push(`${resolveVariantUrl(variants.lg)} ${variants.lg.width}w`);
    srcset = srcsetParts.join(', ');

    const slot = { variants };
    const selectedVariant = getVariantForContainer(slot, 'thumbnail', 'lg');
    if (selectedVariant) {
      src = resolveVariantUrl(selectedVariant) || src;
      width = selectedVariant.width;
      height = selectedVariant.height;
    }
  }

  // Fallback to item URL if calculation failed
  if (!src) src = item.url || '';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 blur-xl scale-110 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden={true}
        />
      )}
      <img
        src={src}
        srcSet={srcset || undefined}
        sizes="180px"
        width={width}
        height={height}
        alt={item.altText || item.name}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};
