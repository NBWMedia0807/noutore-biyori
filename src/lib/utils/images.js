import { urlFor } from '$lib/sanityPublic.js';

const buildWidth = (value) => {
  if (!value || Number.isNaN(value)) return undefined;
  return Math.max(1, Math.round(value));
};

const buildBuilder = (image, width, height) => {
  let builder = urlFor(image).width(buildWidth(width));
  if (height) {
    builder = builder.height(buildWidth(height)).fit('crop');
  }
  return builder;
};

const buildSources = (image, { width, height, quality }) => {
  const scales = [1, 2];
  const make = (format) =>
    scales
      .map((scale) => {
        try {
          let builder = buildBuilder(image, width * scale, height ? height * scale : undefined);
          builder = format ? builder.format(format) : builder.auto('format');
          if (quality) {
            const q = format === 'avif' ? Math.min(quality + 10, 90) : quality;
            builder = builder.quality(q);
          }
          return `${builder.url()} ${buildWidth(width * scale)}w`;
        } catch (error) {
          console.error('[image-utils] Failed to build source', error);
          return null;
        }
      })
      .filter(Boolean);

  const srcset = make();
  const webp = make('webp');
  const avif = make('avif');
  return {
    src: srcset.length ? srcset[0].split(' ')[0] : undefined,
    srcset: srcset.length ? srcset.join(', ') : undefined,
    webpSrcset: webp.length ? webp.join(', ') : undefined,
    avifSrcset: avif.length ? avif.join(', ') : undefined
  };
};

/**
 * urlFor が解釈できる形に画像ソースを正規化する。
 * GROQ で `asset->{ _id, ... }` のように参照解決した画像は `_ref` を持たないため、
 * `_id` を `_ref` に補完する（crop/hotspot などの既存プロパティは維持）。
 */
const normalizeImageSource = (image) => {
  if (!image || typeof image !== 'object' || !image.asset) return image;
  if (image.asset._ref) return image;
  if (image.asset._id) {
    return { ...image, asset: { ...image.asset, _ref: image.asset._id } };
  }
  return image;
};

/**
 * Sanityの画像参照からレスポンシブ画像情報を生成する。
 * asset._ref / asset._id のいずれも無い場合はfallbackUrlのみを返す。
 */
export function createSanityImageSet(image, { width = 800, height, quality = 80, fallbackUrl } = {}) {
  const assetRef =
    image && typeof image === 'object' && image.asset
      ? image.asset._ref ?? image.asset._id
      : null;
  const hasBuilder = Boolean(assetRef);
  const fallback = fallbackUrl ?? (typeof image === 'string' ? image : image?.asset?.url ?? '');

  if (!hasBuilder) {
    return {
      src: fallback,
      fallback
    };
  }

  const sources = buildSources(normalizeImageSource(image), { width, height, quality });
  return {
    ...sources,
    fallback: fallback || sources.src
  };
}
