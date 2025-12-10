<script>
  import { tick } from 'svelte';
  import { createSanityImageSet } from '$lib/utils/images.js';
  import { resolvePublishedDate, formatPublishedDateLabel } from '$lib/utils/publishedDate.js';
  import RelatedQuizSection from '$lib/components/RelatedQuizSection.svelte';

  export let data;

  let doc;
  let relatedQuizzes = [];
  let nextQuiz;
  let publishContext;
  let publishedAt;
  let publishedLabel;
  let fallbackQuizImage;
  let fallbackImageUrl;
  let problemImageSource;
  let problemImageSet;
  let problemImageDimensions;
  let category;
  let categoryUrl;
  let hasRelated;
  let nextQuizUrl;
  let nextQuizLabel;

  $: doc = data?.doc;
  $: relatedQuizzes = Array.isArray(data?.related) ? data.related : [];
  $: nextQuiz = data?.nextQuiz ?? null;
  $: publishContext = doc?._id ?? doc?.slug ?? 'quiz-detail';
  $: publishedAt = resolvePublishedDate(doc, publishContext) ?? null;
  $: publishedLabel = formatPublishedDateLabel(publishedAt, { context: publishContext });

  $: fallbackQuizImage = doc?.problemImage ?? doc?.mainImage;
  $: fallbackImageUrl =
    fallbackQuizImage?.asset?.url ?? doc?.answerImage?.asset?.url ?? '/logo.svg';

  $: problemImageSource = doc?.problemImage ?? doc?.mainImage ?? null;
  $: problemImageSet = problemImageSource
    ? createSanityImageSet(problemImageSource, {
        width: 960,
        quality: 80,
        fallbackUrl: fallbackImageUrl
      })
    : null;
  $: problemImageDimensions = problemImageSource?.asset?.metadata?.dimensions ?? {
    width: 960,
    height: 540
  };

  $: category = doc?.category?.title && doc?.category?.slug ? doc.category : null;
  $: categoryUrl = category ? `/category/${category.slug}` : null;

  $: hasRelated = relatedQuizzes.length > 0;
  $: nextQuizUrl = nextQuiz?.slug ? `/quiz/${nextQuiz.slug}` : '/';
  $: nextQuizLabel = nextQuiz?.title ? `${nextQuiz.title}に挑戦する` : '最新の問題に挑戦する';

  let hintOpen = false;
  // 【修正1】ヒント要素を配列で管理するように変更
  let hintItems = [];

  // Portable Text (blocks) をテキストに変換する関数
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

  // Portable Text を HTML に変換する関数
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

  let bodyHtml;
  
  // ヒント処理
  let hints = [];
  let hintsId;

  $: bodyHtml = (() => {
    const fromBody = toHtml(doc?.body);
    if (fromBody.trim().length) return fromBody;
    const fromProblem = toHtml(doc?.problemDescription);
    return fromProblem;
  })();

  // ヒントデータの正規化
  $: {
    const rawHints = [];
    if (doc?.hint) rawHints.push(doc.hint);
    if (doc?.hints) {
      if (Array.isArray(doc.hints)) {
        rawHints.push(...doc.hints);
      } else {
        rawHints.push(doc.hints);
      }
    }

    hints = rawHints.map(entry => {
      let text = '';
      if (typeof entry === 'string') {
        text = entry;
      } else if (Array.isArray(entry)) {
        text = blocksToText(entry);
      } else {
        text = blocksToText([entry]);
      }
      return { text: text.trim() };
    }).filter(h => h.text.length > 0);
  }

  $: hintsId = doc?.slug ? `hints-${doc.slug}` : 'hints';
  
  const toggleHints = async () => {
    hintOpen = !hintOpen;
    if (hintOpen) {
      await tick();
      // 【修正2】配列の0番目（最初のヒント）にフォーカス
      if (hintItems[0]) {
        hintItems[0].focus();
      }
    }
  };

  // 改行コードを <br> タグに変換する関数
  const formatText = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  };

  let answerPath;
  $: answerPath = `/quiz/${doc?.slug ?? ''}/answer`;
</script>

<main class="quiz-detail hide-chrome">
  <header class="quiz-header">
    {#if category}
      <div class="quiz-meta-row">
        <a class="category-chip" href={categoryUrl}>#{category.title}</a>
      </div>
    {/if}
    <h1 class="quiz-title">{doc.title}</h1>
    {#if publishedLabel}
      <p class="quiz-date">公開日: {publishedLabel}</p>
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
          {#each hints as hint, index (index)}
            <li tabindex="-1" bind:this={hintItems[index]}>
              {@html formatText(hint.text)}
            </li>
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
    <RelatedQuizSection quizzes={relatedQuizzes} />
  {/if}

</main>

<style>
  .quiz-detail {
    max-width: 820px;
    margin: 24px auto 48px;
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
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
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
    height: auto;
    border-radius: 18px;
    box-shadow: 0 10px 25px rgba(249, 115, 22, 0.16);
  }

  .problem-image picture {
    overflow: hidden;
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

  .hints-toggle,
  .to-answer {
    display: flex;
    justify-content: center;
  }

  .hints-toggle .action-button,
  .to-answer .action-button {
    width: min(100%, 320px);
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

  .secondary {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    color: #92400e;
    box-shadow: 0 16px 30px rgba(250, 204, 21, 0.22);
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

    .hints-toggle .action-button,
    .to-answer .action-button {
      width: 100%;
    }

    .section-header {
      margin-bottom: 14px;
    }
  }
</style>
