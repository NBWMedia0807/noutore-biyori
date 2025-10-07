<script>
  import { tick } from 'svelte';
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let data;
  const { doc } = data;
  const relatedQuizzes = Array.isArray(data?.related) ? data.related : [];

  const fallbackQuizImage = doc?.problemImage ?? doc?.mainImage;
  const fallbackImageUrl =
    fallbackQuizImage?.asset?.url ?? doc?.answerImage?.asset?.url ?? '/logo.svg';

  const problemImageSource = doc?.problemImage ?? doc?.mainImage ?? null;
  const problemImageSet = problemImageSource
    ? createSanityImageSet(problemImageSource, {
        width: 960,
        height: 540,
        quality: 80,
        fallbackUrl: fallbackImageUrl
      })
    : null;
  const problemImageDimensions = problemImageSource?.asset?.metadata?.dimensions ?? {
    width: 960,
    height: 540
  };

  const category = doc?.category?.title && doc?.category?.slug ? doc.category : null;
  const categoryUrl = category ? `/category/${category.slug}` : null;

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

  const hasRelated = relatedQuizzes.length > 0;

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  let hintOpen = false;
  let firstHintItem;

  const blocksToText = (blocks) => {
    if (!Array.isArray(blocks)) return '';
    return blocks
      .map((block) => {
        if (typeof block === 'string') return block;
        const children = Array.isArray(block?.children) ? block.children : [];
        return children
          .map((child) => (typeof child?.text === 'string' ? child.text : ''))
          .join('');
      })
      .filter((text) => typeof text === 'string' && text.trim().length > 0)
      .join('\n');
  };

  const escapeHtml = (value) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const toHtml = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const blocks = content
        .filter((block) => block?._type === 'block')
        .map((block) =>
          (block?.children ?? [])
            .filter((child) => child?._type === 'span' && typeof child.text === 'string')
            .map((child) => escapeHtml(child.text))
            .join('')
        )
        .filter((text) => typeof text === 'string' && text.trim().length > 0)
        .map((text) => `<p>${text.replace(/\n/g, '<br />')}</p>`);
      return blocks.join('');
    }
    if (content?._type === 'block') {
      return toHtml([content]);
    }
    return '';
  };

  const bodyHtml = (() => {
    const fromBody = toHtml(doc?.body);
    if (fromBody.trim().length) return fromBody;
    const fromProblem = toHtml(doc?.problemDescription);
    return fromProblem;
  })();
  const hintEntries = (() => {
    const source = [];
    const append = (value) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        source.push(...value);
      } else {
        source.push(value);
      }
    };
    append(doc?.hint);
    append(doc?.hints);

    return source
      .map((entry) => {
        const text = (() => {
          if (typeof entry === 'string') return entry;
          if (Array.isArray(entry)) return blocksToText(entry);
          return blocksToText([entry]);
        })()
          .replace(/\r?\n/g, '\n')
          .trim();

        return { raw: entry, text };
      })
      .filter(({ text }) => text.length > 0);
  })();
  const hints = hintEntries.map(({ raw, text }) => ({ raw, text }));
  const firstHint = hints[0];
  const restHints = hints.slice(1);
  const hintsId = doc?.slug ? `hints-${doc.slug}` : 'hints';
  const toggleHints = async () => {
    hintOpen = !hintOpen;
    if (hintOpen) {
      await tick();
      firstHintItem?.focus();
    }
  };
  const answerPath = `/quiz/${doc?.slug ?? ''}/answer`;
</script>

<main class="quiz-detail hide-chrome">
  <header class="quiz-header">
    <div class="quiz-meta-row">
      <p class="quiz-meta" aria-hidden="true">今日の脳トレ</p>
      {#if category}
        <a class="category-chip" href={categoryUrl}>#{category.title}</a>
      {/if}
    </div>
    <h1 class="quiz-title">{doc.title}</h1>
    <p class="quiz-subtitle">ひらめきスイッチを入れて、ゆったり挑戦しましょう。</p>
    {#if doc?.publishedAt || doc?._createdAt}
      <p class="quiz-date">公開日: {formatDate(doc.publishedAt ?? doc._createdAt)}</p>
    {/if}
  </header>

  {#if problemImageSet?.src}
    <div class="problem-image">
      <picture>
        {#if problemImageSet.avifSrcset}
          <source srcset={problemImageSet.avifSrcset} type="image/avif" sizes="(min-width: 768px) 720px, 100vw" />
        {/if}
        {#if problemImageSet.webpSrcset}
          <source srcset={problemImageSet.webpSrcset} type="image/webp" sizes="(min-width: 768px) 720px, 100vw" />
        {/if}
        <img
          src={problemImageSet.src}
          srcset={problemImageSet.srcset}
          sizes="(min-width: 768px) 720px, 100vw"
          alt={`${doc.title}の問題イメージ`}
          loading="eager"
          decoding="async"
          fetchpriority="high"
          width={Math.round(problemImageDimensions.width)}
          height={Math.round(problemImageDimensions.height)}
        />
      </picture>
    </div>
  {/if}

  {#if bodyHtml}
    <section class="body content-card">
      <div class="section-header">
        <h2>問題</h2>
      </div>
      <div class="section-body">{@html bodyHtml}</div>
    </section>
  {/if}

  {#if hints.length}
    <div class="hints-toggle">
      <button
        type="button"
        class="action-button hint-button"
        aria-expanded={hintOpen}
        aria-controls={hintsId}
        on:click={toggleHints}
      >
        {hintOpen ? 'ヒントを隠す' : 'ヒントを見る'}
      </button>
    </div>

    {#if hintOpen}
      <section class="hints content-card" id={hintsId}>
        <div class="section-header">
          <h2>ヒント</h2>
        </div>
        <ul>
          {#if firstHint}
            <li tabindex="-1" bind:this={firstHintItem}>{firstHint.text}</li>
          {/if}
          {#each restHints as hint, index (`${hint.text}-${index + 1}`)}
            <li tabindex="-1">{hint.text}</li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}

  <nav class="to-answer">
    <a class="action-button primary" href={answerPath}>
      正解ページへ進む
      <span class="sr-only">次のページへ</span>
      <span aria-hidden="true">→</span>
    </a>
  </nav>

  {#if hasRelated}
    <section class="related content-card" aria-labelledby="related-heading">
      <div class="section-header">
        <h2 id="related-heading">関連記事</h2>
      </div>
      <div class="related-grid">
        {#each relatedQuizzes as quiz (quiz.slug)}
          {@const imageSet = getPreviewImageSet(quiz)}
          {@const dims = getPreviewDimensions(quiz)}
          <a class="related-card" href={`/quiz/${quiz.slug}`}>
            {#if imageSet?.src}
              <picture>
                {#if imageSet.avifSrcset}
                  <source srcset={imageSet.avifSrcset} type="image/avif" sizes="(min-width: 768px) 300px, 90vw" />
                {/if}
                {#if imageSet.webpSrcset}
                  <source srcset={imageSet.webpSrcset} type="image/webp" sizes="(min-width: 768px) 300px, 90vw" />
                {/if}
                <img
                  src={imageSet.src}
                  srcset={imageSet.srcset}
                  sizes="(min-width: 768px) 300px, 90vw"
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
              <h4>{quiz.title}</h4>
              {#if quiz?.publishedAt || quiz?.createdAt}
                <p class="related-card-date">{formatDate(quiz.publishedAt ?? quiz.createdAt)}</p>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  .quiz-detail {
    max-width: 820px;
    margin: 24px auto 56px;
    padding: 0 16px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .quiz-header {
    text-align: center;
    background: linear-gradient(135deg, rgba(255, 241, 204, 0.7), rgba(255, 255, 255, 0.9));
    border-radius: 24px;
    padding: 28px 24px 32px;
    box-shadow: 0 18px 45px rgba(255, 193, 7, 0.18);
    border: 1px solid rgba(250, 204, 21, 0.35);
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .quiz-meta-row {
    display: flex;
    gap: 12px;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }

  .quiz-meta {
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    color: #b45309;
    font-weight: 700;
    margin: 0;
  }

  .category-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 1rem;
    border-radius: 999px;
    background: rgba(248, 196, 113, 0.35);
    color: #78350f;
    font-weight: 700;
    text-decoration: none;
    min-height: 36px;
  }

  .category-chip:hover,
  .category-chip:focus-visible {
    background: rgba(245, 158, 11, 0.45);
    outline: none;
  }

  .quiz-title {
    font-size: clamp(1.8rem, 4vw, 2.4rem);
    line-height: 1.4;
    margin: 0;
    color: #78350f;
    font-weight: 800;
  }

  .quiz-subtitle {
    font-size: 1rem;
    color: #92400e;
    opacity: 0.9;
    margin: 0;
  }

  .quiz-date {
    margin: 0;
    color: #92400e;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .problem-image {
    margin: 0 auto;
    text-align: center;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 249, 232, 0.9));
    padding: 18px;
    border-radius: 24px;
    box-shadow: 0 12px 32px rgba(251, 191, 36, 0.22);
    border: 1px solid rgba(253, 224, 71, 0.45);
  }

  .problem-image picture,
  .problem-image img {
    display: block;
    width: 100%;
    border-radius: 18px;
    box-shadow: 0 10px 25px rgba(249, 115, 22, 0.16);
  }

  .problem-image picture {
    overflow: hidden;
    aspect-ratio: calc(16 / 9);
  }

  .content-card {
    background: var(--white);
    border-radius: 24px;
    padding: 28px 24px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(248, 196, 113, 0.32);
  }

  .section-header {
    margin-bottom: 16px;
  }

  .section-header h2 {
    font-size: 1.25rem;
    color: #92400e;
    font-weight: 700;
    margin: 0;
  }

  .section-body :global(p) {
    margin-bottom: 1em;
    line-height: 1.85;
    font-size: 1.05rem;
  }

  .section-body :global(p:last-child) {
    margin-bottom: 0;
  }

  .hints-toggle {
    text-align: center;
  }

  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.95rem 2.4rem;
    border-radius: 999px;
    border: none;
    text-decoration: none;
    font-weight: 700;
    letter-spacing: 0.02em;
    font-size: 1.05rem;
    background: linear-gradient(135deg, #facc15, #f97316);
    color: #78350f;
    box-shadow: 0 18px 32px rgba(249, 115, 22, 0.28);
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
    min-height: 48px;
  }

  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 22px 36px rgba(234, 88, 12, 0.32);
    filter: brightness(1.03);
  }

  .action-button:active {
    transform: translateY(0);
    box-shadow: 0 12px 24px rgba(234, 88, 12, 0.24);
  }

  .action-button span[aria-hidden='true'] {
    font-size: 1.2rem;
  }

  .primary {
    background: linear-gradient(135deg, #facc15, #f97316);
    color: #78350f;
  }

  .hint-button {
    background: linear-gradient(135deg, #fde68a, #fcd34d);
    color: #92400e;
    padding-inline: 2rem;
    box-shadow: 0 16px 28px rgba(250, 204, 21, 0.26);
  }

  .hint-button:hover {
    box-shadow: 0 20px 32px rgba(234, 179, 8, 0.3);
  }

  .hints ul {
    margin: 0;
    padding-left: 1.2em;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .hints li {
    position: relative;
    padding-left: 0.4em;
  }

  .hints li + li {
    margin-top: 0.75rem;
  }

  .hints li::marker {
    color: #f59e0b;
    font-size: 1.2em;
  }

  .to-answer {
    text-align: center;
  }

  .related-grid {
    display: grid;
    gap: 1.2rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .related-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-decoration: none;
    border-radius: 18px;
    overflow: hidden;
    background: #fffef6;
    border: 1px solid rgba(248, 196, 113, 0.35);
    box-shadow: 0 14px 32px rgba(249, 115, 22, 0.14);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .related-card:hover,
  .related-card:focus-visible {
    transform: translateY(-4px);
    box-shadow: 0 18px 40px rgba(234, 88, 12, 0.24);
    outline: none;
  }

  .related-card picture,
  .related-card img {
    display: block;
    width: 100%;
  }

  .related-card picture {
    aspect-ratio: calc(4 / 3);
    overflow: hidden;
  }

  .related-card img {
    height: 100%;
    object-fit: cover;
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

  .related-card h4 {
    margin: 0;
    font-size: 1.05rem;
    color: #78350f;
    line-height: 1.4;
  }

  .related-card-date {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 640px) {
    .quiz-detail {
      margin-top: 16px;
      gap: 20px;
    }

    .quiz-header {
      padding: 24px 18px 28px;
    }

    .content-card {
      padding: 24px 18px;
    }

    .action-button {
      width: 100%;
      padding-inline: 1.8rem;
    }

    .section-header {
      margin-bottom: 14px;
    }

    .related-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>

