<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let quiz = {};
  export let fallbackImageUrl = '/logo.svg';

  const FALLBACK_IMAGE = '/logo.svg';

  // 優先画像の選択（Sanity Asset の有無で判定）
  const pickImageSource = (item) => {
    if (!item) return null;
    if (item?.image?.asset?._ref) return item.image;
    if (item?.problemImage?.asset?._ref) return item.problemImage;
    if (item?.mainImage?.asset?._ref) return item.mainImage;
    if (item?.answerImage?.asset?._ref) return item.answerImage;
    return null;
  };

  // URLフォールバック（どれかのasset.url or 手動URL）
  const pickFallbackUrl = (item) =>
    item?.image?.asset?.url ||
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
      quality: 80,
      fallbackUrl: fallback
    });
  };

  const pickDimensions = (item) => {
    const source = pickImageSource(item);
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
  $: publishedDate = quiz?.publishedAt ?? quiz?._createdAt ?? '';
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
    display: flex;
  }

  .article-card:hover,
  .article-card:focus-within {
    transform: translateY(-4px);
    box-shadow: 0 20px 48px rgba(234, 88, 12, 0.18);
  }

  .article-card__link {
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
  }

  .article-card__image {
    position: relative;
    overflow: hidden;
  }

  .article-card__image picture {
    display: block;
    width: 100%;
    aspect-ratio: calc(16 / 9);
  }

  .article-card__image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .article-card:hover .article-card__image img,
  .article-card:focus-within .article-card__image img {
    transform: scale(1.03);
  }

  .article-card__content {
    padding: 1.2rem 1.4rem 1.4rem;
    display: grid;
    gap: 0.5rem;
    flex: 1;
  }

  .article-card__date {
    color: var(--medium-gray, #4b5563);
    font-size: 0.85rem;
  }

  .article-card__title {
    font-size: 1.05rem;
    color: var(--dark-gray, #1f2937);
    margin: 0;
    line-height: 1.4;
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 520px) {
    .article-card__image picture {
      aspect-ratio: calc(3 / 2);
    }
  }
</style>