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

// Sanity の画像アセット ID（例: image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg）。
// @sanity/image-url はこの形でない _ref/_id を渡すと例外を投げる。
const IMAGE_ASSET_ID = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z0-9]+$/;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isImageAssetId = (value: unknown): value is string =>
  typeof value === 'string' && IMAGE_ASSET_ID.test(value);

const toAbsoluteHttpUrl = (value: string): URL | null => {
  const trimmed = value.trim();
  const absolute = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  if (!URL.canParse(absolute)) return null;
  const url = new URL(absolute);
  return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
};

// URL だけで組むとき、builder の指定で上書きするクエリ（rect は残す）
const OVERRIDDEN_URL_PARAMS = [
  'w',
  'h',
  'fit',
  'crop',
  'fm',
  'auto',
  'min-w',
  'max-w',
  'min-h',
  'max-h',
  'dpr',
];

const isSanityImageUrl = (url: URL) =>
  url.hostname === 'cdn.sanity.io' && url.pathname.startsWith('/images/');

// URL しか無い画像（解決済みの画像・asset.url だけのスタブなど）向け。
// cdn.sanity.io の画像なら builder と同じ w / h / fit / fm / auto を付け直す。
// 既存の rect（Studio でのトリミング）は残す。Sanity 以外の URL はそのまま返す。
const transformImageUrl = (
  value: string,
  { width, height, format }: ImageTransformOptions
): string | null => {
  const url = toAbsoluteHttpUrl(value);
  if (!url) return null;
  if (!isSanityImageUrl(url)) return url.href;

  for (const parameter of OVERRIDDEN_URL_PARAMS) url.searchParams.delete(parameter);
  if (width) url.searchParams.set('w', String(clampWidth(width, 1)));
  if (height) {
    url.searchParams.set('h', String(clampWidth(height, 1)));
    url.searchParams.set('fit', 'crop');
  }
  if (format && format !== 'auto') {
    url.searchParams.set('fm', format);
  } else {
    url.searchParams.set('auto', 'format');
  }
  return url.href;
};

type BuilderInput = { kind: 'builder'; source: SanityImageSource; fallbackUrl: string | null };
type UrlInput = { kind: 'url'; url: string };

// builder に渡せる形か、URL だけで組むか、画像が無いかを判定する。
// builder に渡すのは「アセット ID の形が正しいもの」だけ（例外を出さないため）。
const classifySource = (source: unknown): BuilderInput | UrlInput | null => {
  if (!source) return null;

  if (typeof source === 'string') {
    if (isImageAssetId(source)) return { kind: 'builder', source, fallbackUrl: null };
    return isNonEmptyString(source) ? { kind: 'url', url: source } : null;
  }

  if (typeof source !== 'object') return null;
  const record = source as Record<string, any>;
  const asset = record.asset && typeof record.asset === 'object' ? record.asset : null;

  // 画像フィールド（asset が参照、または asset-> で展開済み）
  if (asset) {
    const assetUrl = isNonEmptyString(asset.url) ? asset.url : null;
    if (isImageAssetId(asset._ref) || isImageAssetId(asset._id)) {
      // asset-> で展開済みのときは _id を _ref として渡す（crop / hotspot を残したまま builder が読める）
      const ref = isImageAssetId(asset._ref) ? asset._ref : asset._id;
      const normalized = { ...record, asset: { _ref: ref } } as SanityImageSource;
      return { kind: 'builder', source: normalized, fallbackUrl: assetUrl };
    }
    if (assetUrl) return { kind: 'url', url: assetUrl };
    return null;
  }

  // 参照そのもの（{ _ref }）や画像アセット文書（{ _id, url }）
  if (isImageAssetId(record._ref) || isImageAssetId(record._id)) {
    const ref = isImageAssetId(record._ref) ? record._ref : record._id;
    return {
      kind: 'builder',
      source: { asset: { _ref: ref } } as SanityImageSource,
      fallbackUrl: isNonEmptyString(record.url) ? record.url : null,
    };
  }

  // 解決済みの画像（{ url, width, height, mimeType, alt }）など、URL だけあるもの
  if (isNonEmptyString(record.url)) return { kind: 'url', url: record.url };

  // asset の無い画像（アップロード途中・画像を外したフィールド）など
  return null;
};

export const buildImageUrl = (
  source: unknown,
  { width, height, format }: ImageTransformOptions = {}
): string | null => {
  const input = classifySource(source);
  if (!input) return null;
  if (input.kind === 'url') return transformImageUrl(input.url, { width, height, format });

  try {
    let urlBuilder = builder.image(input.source);
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
    // 形を確認してから builder に渡しているので、ここに来るのは想定外のときだけ
    console.error('[rss/images] Failed to build image URL', error);
    return input.fallbackUrl
      ? transformImageUrl(input.fallbackUrl, { width, height, format })
      : null;
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
