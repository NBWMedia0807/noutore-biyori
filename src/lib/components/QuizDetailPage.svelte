<script>
  import { createSanityImageSet } from '$lib/utils/images.js';
  import { resolvePublishedDate, formatPublishedDateLabel } from '$lib/utils/publishedDate.js';
  import RelatedQuizSection from '$lib/components/RelatedQuizSection.svelte';
  import InlineCta from '$lib/components/InlineCta.svelte';
  import AdSense from '$lib/components/AdSense.svelte';

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
        fallbackUrl: fallbackImageUrl,
      })
    : null;
  $: problemImageDimensions = problemImageSource?.asset?.metadata?.dimensions ?? {
    width: 960,
    height: 540,
  };

  $: category = doc?.category?.title && doc?.category?.slug ? doc.category : null;
  $: categoryUrl = category ? `/category/${category.slug}` : null;

  $: hasRelated = relatedQuizzes.length > 0;
  $: nextQuizUrl = nextQuiz?.slug ? `/quiz/${nextQuiz.slug}` : '/';
  $: nextQuizLabel = nextQuiz?.title ? `${nextQuiz.title}に挑戦する` : '最新の問題に挑戦する';

  let hintOpen = false;

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
  let bodyHtmlTop;
  let bodyHtmlBottom;
  let inlineCtaQuizzes;
  let hints = [];
  let hintsId;

  $: bodyHtml = (() => {
    const fromBody = toHtml(doc?.body);
    if (fromBody.trim().length) return fromBody;
    const fromProblem = toHtml(doc?.problemDescription);
    return fromProblem;
  })();

  // 50〜60%地点でbodyHtmlをパラグラフ分割してインラインCTA用に上下2分割
  $: {
    const splitBodyHtml = (html) => {
      if (!html) return { top: '', bottom: '' };
      // </p> で分割してパラグラフ配列を作る
      const parts = html.split(/(?<=<\/p>)/);
      const total = parts.length;
      if (total <= 2) return { top: html, bottom: '' };
      // 50〜60%地点（切り上げ）を挿入点とする
      const insertIdx = Math.ceil(total * 0.55);
      return {
        top: parts.slice(0, insertIdx).join(''),
        bottom: parts.slice(insertIdx).join('')
      };
    };
    const { top, bottom } = splitBodyHtml(bodyHtml);
    bodyHtmlTop = top;
    bodyHtmlBottom = bottom;
  }

  // インラインCTAに使う関連記事（最大3件）
  $: inlineCtaQuizzes = relatedQuizzes.slice(0, 3);

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

    hints = rawHints
      .map((entry) => {
        let text = '';
        if (typeof entry === 'string') {
          text = entry;
        } else if (Array.isArray(entry)) {
          text = blocksToText(entry);
        } else {
          text = blocksToText([entry]);
        }
        return { text: text.trim() };
      })
      .filter((h) => h.text.length > 0);
  }

  $: hintsId = doc?.slug ? `hints-${doc.slug}` : 'hints';

  const toggleHints = () => {
    hintOpen = !hintOpen;
  };

  // 改行コードを <br> タグに変換する関数
  const formatText = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  };

  let answerPath;
  $: answerPath = `/quiz/${doc?.slug ?? ''}/answer`;

  function showRewardedAd() {
    if (typeof googletag === 'undefined' || typeof googletag.enums === 'undefined') {
      window.location.href = answerPath;
      return;
    }

    googletag.cmd.push(() => {
      const slot = googletag
        .defineOutOfPageSlot(
          '/23345812008/noutorebiyori-rewarded',
          googletag.enums.OutOfPageFormat.REWARDED
        )
        ?.addService(googletag.pubads());

      if (!slot) {
        window.location.href = answerPath;
        return;
      }

      // 広告が一定時間内に表示されない場合のフォールバック
      const fallbackTimer = setTimeout(() => {
        googletag.destroySlots([slot]);
        window.location.href = answerPath;
      }, 3000);

      googletag.pubads().addEventListener('rewardedSlotReady', (event) => {
        clearTimeout(fallbackTimer);
        event.makeRewardedVisible();
      });

      googletag.pubads().addEventListener('rewardedSlotGranted', () => {
        googletag.destroySlots([slot]);
        window.location.href = answerPath;
      });

      googletag.pubads().addEventListener('rewardedSlotClosed', () => {
        clearTimeout(fallbackTimer);
        googletag.destroySlots([slot]);
      });

      googletag.display(slot);
    });
  }
</script>

<main class="quiz-detail hide-chrome">
  <header class="quiz-header">
    {#if category}
      <div class="quiz-meta-row">
        <a class="category-chip" href={categoryUrl}>{category.title}</a>
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
          <source
            srcset={problemImageSet.avifSrcset}
            type="image/avif"
            sizes="(min-width: 768px) 720px, 100vw"
          />
        {/if}
        {#if problemImageSet.webpSrcset}
          <source
            srcset={problemImageSet.webpSrcset}
            type="image/webp"
            sizes="(min-width: 768px) 720px, 100vw"
          />
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

  <!-- 記事内: 問題画像下の広告 -->
  <AdSense slot="3921249196" />

  {#if bodyHtml}
    <section class="body content-card">
      <div class="section-header">
        <h2>問題</h2>
      </div>
      {#if bodyHtmlBottom && inlineCtaQuizzes.length > 0}
        <div class="section-body">{@html bodyHtmlTop}</div>
        <InlineCta quizzes={inlineCtaQuizzes} />
        <div class="section-body">{@html bodyHtmlBottom}</div>
      {:else}
        <div class="section-body">{@html bodyHtml}</div>
      {/if}
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
          {#each hints as hint}
            <li tabindex="-1">
              {@html formatText(hint.text)}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}

  <nav class="to-answer">
    <button class="action-button primary" on:click={showRewardedAd}>
      正解ページへ進む
      <span class="sr-only">次のページへ</span>
      <span aria-hidden="true">→</span>
    </button>
  </nav>

  <!-- 記事下: 関連記事上の広告 -->
  <AdSense slot="1724332823" />

  <a
    class="x-banner"
    href="https://x.com/noutorebiyori"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="脳トレ日和 公式Xアカウントをフォロー"
  >
    <img
      src="/x-banner.jpg"
      alt="脳トレ日和 公式Xはじめました！最新クイズやアハ体験をお届け フォローする"
      loading="lazy"
      decoding="async"
      width="1024"
      height="318"
    />
  </a>

  {#if hasRelated}
    <RelatedQuizSection quizzes={relatedQuizzes} />
  {/if}

  {#if categoryUrl}
    <nav class="category-nav">
      <a class="action-button secondary" href={categoryUrl}>
        {category.title}の問題一覧へ
        <span aria-hidden="true">→</span>
      </a>
    </nav>
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
    overflow-x: clip; /* フルブリード広告のはみ出しを許容 */
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
    gap: 0.3rem;
    padding: 0.3rem 1rem;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(253, 224, 71, 0.6), rgba(251, 191, 36, 0.5));
    border: 1.5px solid rgba(245, 158, 11, 0.5);
    color: #78350f;
    font-weight: 800;
    font-size: 0.88rem;
    text-decoration: none;
    min-height: 34px;
    letter-spacing: 0.02em;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.18);
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }

  .category-chip::before {
    content: '#';
    opacity: 0.7;
    font-weight: 900;
  }

  .category-chip:hover,
  .category-chip:focus-visible {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.75), rgba(245, 158, 11, 0.65));
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.28);
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
  .to-answer,
  .category-nav {
    display: flex;
    justify-content: center;
  }

  .hints-toggle .action-button,
  .to-answer .action-button,
  .category-nav .action-button {
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
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      filter 0.2s ease;
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

  /* 【修正】リストマーカーを消してスタイル調整 */
  .hints ul {
    margin: 0;
    padding-left: 0;
    list-style: none; /* ここで丸を消しています */
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .hints li {
    position: relative;
    padding-left: 0;
  }

  .hints li + li {
    margin-top: 0.75rem;
  }

  /* 以前あった .hints li::marker ブロックは削除しました */

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
    .to-answer .action-button,
    .category-nav .action-button {
      width: 100%;
    }

    .section-header {
      margin-bottom: 14px;
    }
  }

  .x-banner {
    display: block;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .x-banner:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }

  .x-banner img {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
