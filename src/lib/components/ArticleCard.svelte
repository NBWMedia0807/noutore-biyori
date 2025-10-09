<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let quiz = {};
  export let fallbackImageUrl = '/logo.svg';

  const FALLBACK_IMAGE = '/logo.svg';

  const pickImageSource = (item) => {
    if (!item) return null;
    if (item?.problemImage?.asset?._ref) return item.problemImage;
    if (item?.mainImage?.asset?._ref) return item.mainImage;
    if (item?.answerImage?.asset?._ref) return item.answerImage;
    return null;
  };

  const pickFallbackUrl = (item) =>
    item?.problemImage?.asset?.url ||
    item?.mainImage?.asset?.url ||
    item?.answerImage?.asset?.url ||
    item?.thumbnailUrl ||
    fallbackImageUrl ||
    FALLBACK_IMAGE;

  const buildImageSet = (item) => {
    if (!item) return null;
    const fallback = pickFallbackUrl(item);
    const source = pickImageSource(item);
    const builderSource = source ?? fallback;
    if (!builderSource && !fallback) return null;
    return createSanityImageSet(builderSource, {
      width: 600,
      height: 360,
      quality: 75,
      fallbackUrl: fallback
    });
  };

  $: imageSet = buildImageSet(quiz);
  $: slug = quiz?.slug;
  $: href = slug ? `/quiz/${slug}` : '#';
  $: title = quiz?.title ?? '脳トレ問題';
</script>

<a class="article-card" href={href} aria-label={`${title}の詳細を見る`}>
  {#if imageSet?.src}
    <picture>
      {#if imageSet.avifSrcset}
        <source srcset={imageSet.avifSrcset} type="image/avif" sizes="(min-width: 768px) 220px, 90vw" />
      {/if}
      {#if imageSet.webpSrcset}
        <source srcset={imageSet.webpSrcset} type="image/webp" sizes="(min-width: 768px) 220px, 90vw" />
      {/if}
      <img
        src={imageSet.src}
        srcset={imageSet.srcset}
        sizes="(min-width: 768px) 220px, 90vw"
        alt={title}
        loading="lazy"
        decoding="async"
        width="600"
        height="360"
      />
    </picture>
  {/if}
  <div class="article-card__body">
    <h3>{title}</h3>
  </div>
</a>

<style>
  .article-card {
    display: block;
    text-decoration: none;
    border: 1px solid #eee;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    color: inherit;
  }

  .article-card:hover,
  .article-card:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
    outline: none;
  }

  .article-card picture,
  .article-card img {
    display: block;
    width: 100%;
  }

  .article-card img {
    height: 160px;
    object-fit: cover;
  }

  .article-card__body {
    padding: 12px;
  }

  .article-card__body h3 {
    margin: 0;
    font-size: 16px;
    line-height: 1.4;
    color: #1f2937;
  }
</style>
