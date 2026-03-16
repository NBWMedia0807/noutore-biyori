<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  /** @type {Array<{slug: string, title: string, category?: {slug: string, title: string}, problemImage?: any, thumbnailUrl?: string}>} */
  export let quizzes = [];

  const MAX_ITEMS = 3;

  const FALLBACK_IMAGE = '/logo.svg';

  const pickFallbackUrl = (quiz) =>
    quiz?.problemImage?.asset?.url ||
    quiz?.mainImage?.asset?.url ||
    quiz?.thumbnailUrl ||
    FALLBACK_IMAGE;

  const pickImageSource = (quiz) => {
    if (quiz?.problemImage?.asset?._ref) return quiz.problemImage;
    if (quiz?.mainImage?.asset?._ref) return quiz.mainImage;
    return null;
  };

  const buildThumb = (quiz) => {
    const fallback = pickFallbackUrl(quiz);
    const source = pickImageSource(quiz) ?? fallback;
    return createSanityImageSet(source, { width: 120, height: 80, quality: 75, fallbackUrl: fallback });
  };

  const normalizeSlug = (v) =>
    typeof v === 'string' ? v.trim() : typeof v?.current === 'string' ? v.current.trim() : '';

  $: items = Array.isArray(quizzes)
    ? quizzes.filter((q) => q?.slug).slice(0, MAX_ITEMS)
    : [];
</script>

{#if items.length > 0}
  <aside class="inline-cta" aria-label="同カテゴリの関連記事">
    <div class="inline-cta__heading">
      <span class="inline-cta__icon" aria-hidden="true">🧠</span>
      こちらの問題もどうぞ
    </div>
    <ul class="inline-cta__list">
      {#each items as quiz (quiz.slug)}
        {@const slug = normalizeSlug(quiz.slug)}
        {@const href = slug ? `/quiz/${slug}` : '#'}
        {@const thumb = buildThumb(quiz)}
        <li class="inline-cta__item">
          <a class="inline-cta__link" {href}>
            {#if thumb?.src}
              <div class="inline-cta__thumb" aria-hidden="true">
                <img
                  src={thumb.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="120"
                  height="80"
                />
              </div>
            {/if}
            <span class="inline-cta__title">{quiz.title ?? '脳トレ問題'}</span>
            <span class="inline-cta__arrow" aria-hidden="true">→</span>
          </a>
        </li>
      {/each}
    </ul>
  </aside>
{/if}

<style>
  .inline-cta {
    background: linear-gradient(135deg, rgba(255, 249, 232, 0.95), rgba(255, 243, 210, 0.9));
    border: 1.5px solid rgba(250, 204, 21, 0.4);
    border-radius: 20px;
    padding: 20px 22px;
    box-shadow: 0 8px 28px rgba(249, 115, 22, 0.1);
    margin: 1.5rem 0;
  }

  .inline-cta__heading {
    font-size: 0.95rem;
    font-weight: 800;
    color: #92400e;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .inline-cta__icon {
    font-size: 1.1rem;
  }

  .inline-cta__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .inline-cta__item {
    border-radius: 12px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(250, 204, 21, 0.25);
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }

  .inline-cta__item:hover {
    box-shadow: 0 6px 18px rgba(234, 88, 12, 0.15);
    transform: translateY(-1px);
  }

  .inline-cta__link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    text-decoration: none;
    color: inherit;
  }

  .inline-cta__thumb {
    flex-shrink: 0;
    width: 80px;
    height: 54px;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }

  .inline-cta__thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .inline-cta__title {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .inline-cta__arrow {
    flex-shrink: 0;
    font-size: 1rem;
    color: #f97316;
    font-weight: 700;
  }

  @media (max-width: 520px) {
    .inline-cta {
      padding: 16px 16px;
    }

    .inline-cta__thumb {
      width: 64px;
      height: 44px;
    }
  }
</style>
