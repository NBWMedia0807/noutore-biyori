// src/lib/rss/images.ts
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { client } from '$lib/sanity.server.js';

const builder = imageUrlBuilder(client);

const clampWidth = (value?: number | null, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(fallback, Math.round(value));
  }
  return fallback;
};

export type ImageTransformOptions = {
  width?: number;
  height?: number;
  format?: 'jpg' | 'png' | 'webp' | 'auto';
};

export const buildImageUrl = (
  source: unknown,
  { width, height, format }: ImageTransformOptions = {}
): string | null => {
  if (!source) return null;
  try {
    let urlBuilder = builder.image(source as SanityImageSource);
    if (width) {
      urlBuilder = urlBuilder.width(clampWidth(width, 1));
    }
    if (height) {
      urlBuilder = urlBuilder.height(clampWidth(height, 1)).fit('crop');
    }
    if (format && format !== 'auto') {
      urlBuilder = urlBuilder.format(format);
    } else {
      urlBuilder = urlBuilder.auto('format');
    }
    return urlBuilder.url();
  } catch (error) {
    console.error('[rss/images] Failed to build image URL', error);
    if (typeof source === 'string') return source;
    const fallback =
      (source as { asset?: { url?: string } })?.asset?.url ||
      (source as { url?: string })?.url ||
      null;
    return fallback ?? null;
  }
};

export type ResolvedImage = {
  url: string;
  width: number;
  height: number;
  mimeType: string;
  alt?: string | null;
};

const pickMimeType = (source: any): string => {
  const explicit = typeof source?.asset?.mimeType === 'string' ? source.asset.mimeType : null;
  if (explicit) return explicit;
  const extension = typeof source?.asset?.extension === 'string' ? source.asset.extension.toLowerCase() : '';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const ensureDimensions = (source: any): { width: number; height: number } => {
  const dimensions = source?.asset?.metadata?.dimensions;
  const width = clampWidth(dimensions?.width, 0);
  const height = clampWidth(dimensions?.height, 0);
  return { width, height };
};

export const resolveImage = (
  sources: Array<any>,
  { minWidth = 0 }: { minWidth?: number } = {}
): ResolvedImage | null => {
  for (const candidate of sources) {
    if (!candidate) continue;
    const url = buildImageUrl(candidate, { width: Math.max(minWidth, 0) });
    if (!url) continue;
    const { width, height } = ensureDimensions(candidate);
    const meetsWidth = width === 0 || width >= minWidth;
    if (!meetsWidth) continue;
    return {
      url,
      width,
      height,
      mimeType: pickMimeType(candidate),
      alt: typeof candidate?.alt === 'string' ? candidate.alt : null
    };
  }
  return null;
};
