<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let quizzes = [];
  export let headingId = 'related-heading';
  export let fallbackImageUrl = '/logo.svg';

  const MAX_ITEMS = 6;
  const headingText = '関連記事';
codex/add-recommended-articles-section-layout-jkjy9g
  const responsiveImageSizes =
    '(min-width: 768px) 260px, (min-width: 480px) 45vw, 90vw';

main

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  const getPreviewImageSet = (quiz) => {
    const source = quiz?.image ?? quiz?.problemImage ?? quiz?.mainImage ?? null;
    const fallback = source?.asset?.url ?? fallbackImageUrl;
    return createSanityImageSet(source ?? fallback, {
      width: 480,
      height: 288,
      quality: 75,
      fallbackUrl: fallback
    });
  };

  const getPreviewDimensions = (quiz) => {
    const source = quiz?.image ?? quiz?.problemImage ?? quiz?.mainImage;
    return source?.asset?.metadata?.dimensions ?? { width: 480, height: 288 };
  };

  $: items = Array.isArray(quizzes) ? quizzes.slice(0, MAX_ITEMS) : [];
  $: hasItems = items.length > 0;
</script>

{#if hasItems}
  <section class="related-section" aria-labelledby={headingId}>
    <div class="related-header">
      <h2 id={headingId}>{headingText}</h2>
    </div>
    <div class="related-grid">
      {#each items as quiz (quiz.slug)}
        {@const imageSet = getPreviewImageSet(quiz)}
        {@const dims = getPreviewDimensions(quiz)}
        <a class="related-card" href={`/quiz/${quiz.slug}`}>
          {#if imageSet?.src}
            <picture>
              {#if imageSet.avifSrcset}
                <source
                  srcset={imageSet.avifSrcset}
                  type="image/avif"
codex/add-recommended-articles-section-layout-jkjy9g
                  sizes={responsiveImageSizes}

                  sizes="(min-width: 960px) 260px, (min-width: 640px) 45vw, 90vw"
main
                />
              {/if}
              {#if imageSet.webpSrcset}
                <source
                  srcset={imageSet.webpSrcset}
                  type="image/webp"
codex/add-recommended-articles-section-layout-jkjy9g
                  sizes={responsiveImageSizes}

                  sizes="(min-width: 960px) 260px, (min-width: 640px) 45vw, 90vw"
main
                />
              {/if}
              <img
                src={imageSet.src}
                srcset={imageSet.srcset}
codex/add-recommended-articles-section-layout-jkjy9g
                sizes={responsiveImageSizes}

                sizes="(min-width: 960px) 260px, (min-width: 640px) 45vw, 90vw"
main
                alt={`${quiz.title}の問題イメージ`}
                loading="lazy"
                decoding="async"
                width={Math.round(dims.width)}
                height={Math.round(dims.height)}
              />
            </picture>
          {/if}
          <div class="related-card-body">
            <p class="related-card-category">#{quiz?.category?.title ?? '脳トレ'}</p>
            <h3>{quiz.title}</h3>
            {#if quiz?.publishedAt || quiz?.createdAt}
              <p class="related-card-date">{formatDate(quiz.publishedAt ?? quiz.createdAt)}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  .related-section {
    background: #fffef6;
    border-radius: 24px;
    padding: 28px 24px 32px;
    box-shadow: 0 18px 45px rgba(249, 115, 22, 0.14);
    border: 1px solid rgba(248, 196, 113, 0.35);
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .related-header h2 {
    margin: 0;
    font-size: 1.35rem;
    color: #9a3412;
    font-weight: 800;
    text-align: center;
  }

  .related-grid {
    display: grid;
    gap: 1.4rem;
    grid-template-columns: minmax(0, 1fr);
  }

  .related-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-decoration: none;
    border-radius: 18px;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid rgba(248, 196, 113, 0.35);
    box-shadow: 0 14px 32px rgba(249, 115, 22, 0.12);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .related-card:hover,
  .related-card:focus-visible {
    transform: translateY(-4px);
    box-shadow: 0 20px 44px rgba(234, 88, 12, 0.22);
    outline: none;
  }

  .related-card picture {
    aspect-ratio: calc(4 / 3);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff7ed;
  }

  .related-card img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .related-card-body {
    padding: 0 1.2rem 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .related-card-category {
    margin: 0;
    font-size: 0.85rem;
    color: #b45309;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .related-card h3 {
    margin: 0;
    font-size: 1.05rem;
    color: #78350f;
    line-height: 1.4;
    font-weight: 700;
  }

  .related-card-date {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
  }

codex/add-recommended-articles-section-layout-jkjy9g
  @media (min-width: 768px) {

  @media (min-width: 640px) {
    .related-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 960px) {
main
    .related-section {
      padding: 32px 28px 36px;
    }

    .related-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .related-section {
      padding: 24px 18px 28px;
      gap: 1.5rem;
    }

    .related-card {
      box-shadow: 0 14px 34px rgba(249, 115, 22, 0.18);
    }
  }
</style>
