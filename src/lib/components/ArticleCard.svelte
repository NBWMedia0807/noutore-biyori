<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let quiz = {};
  export let fallbackImageUrl = '/logo.svg';

  const FALLBACK_IMAGE = '/logo.svg';

codex/hide-subtitle-and-unify-display-specs-1rkvqu
  const pickPrimaryImage = (item) => {
    if (!item) return null;
    if (item?.image) return item.image;
    if (item?.problemImage) return item.problemImage;
    if (item?.mainImage) return item.mainImage;
    if (item?.answerImage) return item.answerImage;

  const pickImageSource = (item) => {
    if (!item) return null;
    if (item?.problemImage?.asset?._ref) return item.problemImage;
    if (item?.mainImage?.asset?._ref) return item.mainImage;
    if (item?.answerImage?.asset?._ref) return item.answerImage;
main
    return null;
  };

  const pickFallbackUrl = (item) =>
codex/hide-subtitle-and-unify-display-specs-1rkvqu
    item?.image?.asset?.url ||

main
    item?.problemImage?.asset?.url ||
    item?.mainImage?.asset?.url ||
    item?.answerImage?.asset?.url ||
    item?.thumbnailUrl ||
    fallbackImageUrl ||
    FALLBACK_IMAGE;

  const buildImageSet = (item) => {
codex/hide-subtitle-and-unify-display-specs-1rkvqu
    const fallback = pickFallbackUrl(item);
    const source = pickPrimaryImage(item) ?? fallback;
    if (!source && !fallback) return null;
    return createSanityImageSet(source, {
      width: 600,
      height: 360,
      quality: 80,

    if (!item) return null;
    const fallback = pickFallbackUrl(item);
    const source = pickImageSource(item);
    const builderSource = source ?? fallback;
    if (!builderSource && !fallback) return null;
    return createSanityImageSet(builderSource, {
      width: 600,
      height: 360,
      quality: 75,
main
      fallbackUrl: fallback
    });
  };

codex/hide-subtitle-and-unify-display-specs-1rkvqu
  const pickDimensions = (item) => {
    const source = pickPrimaryImage(item);
    return source?.asset?.metadata?.dimensions ?? { width: 600, height: 360 };
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  $: imageSet = buildImageSet(quiz);
  $: dimensions = pickDimensions(quiz);
  $: slug = typeof quiz?.slug === 'string' ? quiz.slug : '';
  $: href = slug ? `/quiz/${slug}` : '#';
  $: title = quiz?.title ?? '脳トレ問題';
  $: categoryTitle = quiz?.category?.title ?? quiz?.categoryTitle ?? '';
  $: publishedDate = quiz?.publishedAt ?? quiz?.createdAt ?? quiz?._createdAt ?? '';
  $: formattedDate = formatDate(publishedDate);
</script>

<article class="article-card">
  <a class="article-card__link" href={href} aria-label={`${title}の詳細を見る`}>
    {#if imageSet?.src}
      <div class="article-card__image">
        <picture>
          {#if imageSet.avifSrcset}
            <source srcset={imageSet.avifSrcset} type="image/avif" sizes="(min-width: 768px) 280px, 90vw" />
          {/if}
          {#if imageSet.webpSrcset}
            <source srcset={imageSet.webpSrcset} type="image/webp" sizes="(min-width: 768px) 280px, 90vw" />
          {/if}
          <img
            src={imageSet.src}
            srcset={imageSet.srcset}
            sizes="(min-width: 768px) 280px, 90vw"
            alt={title}
            loading="lazy"
            decoding="async"
            width={Math.round(dimensions.width)}
            height={Math.round(dimensions.height)}
          />
        </picture>
        {#if categoryTitle}
          <div class="article-card__category">#{categoryTitle}</div>
        {/if}
      </div>
    {/if}
    <div class="article-card__content">
      {#if formattedDate}
        <div class="article-card__date">{formattedDate}</div>
      {/if}
      <h3 class="article-card__title">{title}</h3>
    </div>
  </a>
</article>

<style>
  .article-card {
    background: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(248, 196, 113, 0.35);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .article-card:hover,
  .article-card:focus-within {
    transform: translateY(-4px);
    box-shadow: 0 20px 48px rgba(234, 88, 12, 0.18);
  }

  .article-card__link {
    text-decoration: none;
    color: inherit;
    display: grid;
    gap: 0;
  }

  .article-card__image {
    position: relative;
    overflow: hidden;
  }

  .article-card__image picture,
  .article-card__image img {

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
main
    display: block;
    width: 100%;
  }

codex/hide-subtitle-and-unify-display-specs-1rkvqu
  .article-card__image picture {
    aspect-ratio: calc(5 / 3);
  }

  .article-card__image img {
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .article-card:hover .article-card__image img,
  .article-card:focus-within .article-card__image img {
    transform: scale(1.03);
  }

  .article-card__category {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(250, 204, 21, 0.95);
    color: #7c2d12;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    box-shadow: 0 8px 18px rgba(250, 204, 21, 0.35);
  }

  .article-card__content {
    padding: 1.4rem 1.6rem 1.6rem;
    display: grid;
    gap: 0.6rem;
  }

  .article-card__date {
    color: var(--medium-gray, #4b5563);
    font-size: 0.9rem;
  }

  .article-card__title {
    font-size: 1.15rem;
    color: var(--dark-gray, #1f2937);
    margin: 0;
    line-height: 1.5;
    font-weight: 700;
  }

  @media (max-width: 520px) {
    .article-card__image picture {
      aspect-ratio: calc(4 / 3);
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
main
  }
</style>
