<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let data;
  const { quiz } = data;
  const relatedQuizzes = Array.isArray(data?.related) ? data.related : [];
  const closingDefault =
    'このシリーズは毎日更新。明日も新作を公開します。ブックマークしてまた挑戦してください！';

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

  const toPlainText = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((block) => block?._type === 'block')
        .map((block) =>
          (block?.children ?? [])
            .filter((child) => child?._type === 'span' && typeof child.text === 'string')
            .map((child) => child.text)
            .join('')
        )
        .filter((text) => typeof text === 'string' && text.trim().length > 0)
        .join('\n');
    }
    if (content?._type === 'block') {
      return toPlainText([content]);
    }
    return '';
  };

  const answerHtml = toHtml(quiz?.answerExplanation);
  const closingText = (() => {
    const text = toPlainText(quiz?.closingMessage);
    return text.trim().length ? text.trim() : closingDefault;
  })();
  const questionPath = `/quiz/${quiz?.slug ?? ''}`;
  const fallbackImageUrl = quiz?.answerImage?.asset?.url ?? '/logo.svg';

  const getPreviewImageSet = (relatedQuiz) => {
    const source = relatedQuiz?.image ?? null;
    const fallback = source?.asset?.url ?? fallbackImageUrl;
    return createSanityImageSet(source ?? fallback, {
      width: 480,
      height: 288,
      quality: 75,
      fallbackUrl: fallback
    });
  };

  const getPreviewDimensions = (relatedQuiz) => {
    const source = relatedQuiz?.image ?? null;
    return source?.asset?.metadata?.dimensions ?? { width: 480, height: 288 };
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

  const hasRelated = relatedQuizzes.length > 0;
</script>

<main class="answer-page hide-chrome">
  <header class="quiz-header">
    <p class="quiz-meta" aria-hidden="true">答え合わせ</p>
    <h1 class="quiz-title">{quiz.title}｜正解</h1>
    <p class="quiz-subtitle">なぜそうなるかを知ると、次の挑戦がもっと楽しくなります。</p>
  </header>

  {#if quiz.answerImage?.asset?.url}
    <div class="answer-image">
      <img src={quiz.answerImage.asset.url} alt="正解画像" loading="lazy" decoding="async" />
    </div>
  {/if}

  {#if answerHtml}
    <section class="answer-explanation content-card">
      <div class="section-header">
        <h2>解説</h2>
      </div>
      <div class="section-body">{@html answerHtml}</div>
    </section>
  {/if}

  <nav class="back-nav">
    <a class="action-button secondary" href={questionPath}>
      <span aria-hidden="true">←</span>
      問題ページに戻る
    </a>
  </nav>

  {#if hasRelated}
    <section class="related content-card" aria-labelledby="related-heading">
      <div class="section-header">
        <h2 id="related-heading">関連記事</h2>
      </div>
      <div class="related-grid">
        {#each relatedQuizzes as relatedQuiz (relatedQuiz.slug)}
          {@const imageSet = getPreviewImageSet(relatedQuiz)}
          {@const dims = getPreviewDimensions(relatedQuiz)}
          <a class="related-card" href={`/quiz/${relatedQuiz.slug}`}>
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
                  alt={`${relatedQuiz.title}の問題イメージ`}
                  loading="lazy"
                  decoding="async"
                  width={Math.round(dims.width)}
                  height={Math.round(dims.height)}
                />
              </picture>
            {/if}
            <div class="related-card-body">
              <p class="related-card-category">#{relatedQuiz?.category?.title ?? '脳トレ'}</p>
              <h4>{relatedQuiz.title}</h4>
              {#if relatedQuiz?.publishedAt || relatedQuiz?.createdAt}
                <p class="related-card-date">{formatDate(relatedQuiz.publishedAt ?? relatedQuiz.createdAt)}</p>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <footer class="closing">
    <div class="closing-card">
      <p>{closingText || closingDefault}</p>
    </div>
  </footer>
</main>

<style>
  .answer-page {
    max-width: 820px;
    margin: 24px auto 56px;
    padding: 0 16px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .quiz-header {
    text-align: center;
    background: linear-gradient(135deg, rgba(255, 237, 213, 0.72), rgba(255, 255, 255, 0.94));
    border-radius: 24px;
    padding: 28px 24px 32px;
    box-shadow: 0 18px 45px rgba(251, 146, 60, 0.18);
    border: 1px solid rgba(253, 186, 116, 0.35);
    backdrop-filter: blur(4px);
  }

  .quiz-meta {
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    color: #9a3412;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .quiz-title {
    font-size: clamp(1.7rem, 3.8vw, 2.35rem);
    line-height: 1.4;
    margin-bottom: 12px;
    color: #7c2d12;
    font-weight: 800;
  }

  .quiz-subtitle {
    font-size: 1rem;
    color: #9a3412;
    opacity: 0.9;
  }

  .answer-image {
    margin: 0 auto;
    text-align: center;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 247, 237, 0.92));
    padding: 18px;
    border-radius: 24px;
    box-shadow: 0 12px 32px rgba(251, 191, 36, 0.18);
    border: 1px solid rgba(254, 215, 170, 0.45);
  }

  .answer-image img {
    max-width: 100%;
    height: auto;
    border-radius: 18px;
    box-shadow: 0 10px 25px rgba(248, 113, 113, 0.16);
  }

  .content-card {
    background: var(--white);
    border-radius: 24px;
    padding: 28px 24px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(248, 196, 113, 0.28);
  }

  .section-header {
    margin-bottom: 16px;
  }

  .section-header h2 {
    font-size: 1.25rem;
    color: #b91c1c;
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

  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.85rem 2.4rem;
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

  .secondary {
    background: linear-gradient(135deg, #fde68a, #fbbf24);
    color: #92400e;
    box-shadow: 0 16px 28px rgba(250, 204, 21, 0.26);
  }

  .back-nav {
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

  .closing {
    margin: 0;
  }

  .closing-card {
    margin: 0 auto;
    max-width: 640px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(255, 248, 227, 0.94));
    border-radius: 22px;
    padding: 24px 22px;
    text-align: center;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(254, 215, 170, 0.35);
    color: #92400e;
    line-height: 1.8;
    white-space: pre-line;
  }

  @media (max-width: 640px) {
    .answer-page {
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
