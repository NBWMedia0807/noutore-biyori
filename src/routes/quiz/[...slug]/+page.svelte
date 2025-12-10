<script>
  import { createSanityImageSet } from '$lib/utils/images.js';
  import { resolvePublishedDate, formatPublishedDateLabel } from '$lib/utils/publishedDate.js';
  import RelatedQuizSection from '$lib/components/RelatedQuizSection.svelte';

  export let data;

  // 安全にデータを取得（データがない場合は空オブジェクトにする）
  $: doc = data?.doc || {};
  $: relatedQuizzes = Array.isArray(data?.related) ? data.related : [];
  $: nextQuiz = data?.nextQuiz ?? null;
  
  // 日付関連
  $: publishContext = doc?._id ?? doc?.slug ?? 'quiz-detail';
  $: publishedAt = resolvePublishedDate(doc, publishContext) ?? null;
  $: publishedLabel = formatPublishedDateLabel(publishedAt, { context: publishContext });

  // 画像関連（エラーガード付き）
  $: fallbackImageUrl = doc?.mainImage?.asset?.url ?? '/logo.svg';
  $: problemImageSource = doc?.problemImage ?? doc?.mainImage ?? null;
  $: problemImageSet = problemImageSource
    ? createSanityImageSet(problemImageSource, { width: 960, quality: 80, fallbackUrl: fallbackImageUrl })
    : null;
  $: problemImageDimensions = problemImageSource?.asset?.metadata?.dimensions ?? { width: 960, height: 540 };

  // カテゴリ・リンク
  $: category = doc?.category;
  $: categoryUrl = category?.slug ? `/category/${category.slug}` : null;
  $: nextQuizUrl = nextQuiz?.slug ? `/quiz/${nextQuiz.slug}` : '/';
  $: answerPath = `/quiz/${doc?.slug ?? ''}/answer`;

  // ヒント開閉フラグ
  let hintOpen = false;
  const toggleHints = () => { hintOpen = !hintOpen; };

  // --- ヒント処理（ここを一番シンプルに！） ---
  // PortableTextがきても文字列がきても、とにかく「ただの文字」にして返す関数
  const getRawText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      return val.map(block => {
        if (block._type !== 'block' || !block.children) return '';
        return block.children.map(child => child.text).join('');
      }).join('\n');
    }
    return '';
  };

  // ヒント配列の作成
  let hints = [];
  $: {
    const rawList = [];
    if (doc?.hint) rawList.push(doc.hint);
    if (doc?.hints) {
      Array.isArray(doc.hints) ? rawList.push(...doc.hints) : rawList.push(doc.hints);
    }
    // テキストに変換してリスト化
    hints = rawList.map(item => getRawText(item)).filter(t => t.trim() !== '');
  }

  // 本文HTML生成（最低限の処理）
  const toHtml = (blocks) => {
    if (!blocks) return '';
    // ここでエラーが出ないように単純化
    try {
      if (typeof blocks === 'string') return blocks;
      return blocks.map(b => `<p>${b.children?.map(c => c.text).join('') ?? ''}</p>`).join('');
    } catch (e) { return ''; }
  };
  
  $: bodyHtml = doc?.body ? toHtml(doc.body) : toHtml(doc?.problemDescription);

</script>

<main class="quiz-detail hide-chrome">
  <header class="quiz-header">
    {#if categoryUrl}<div class="quiz-meta-row"><a class="category-chip" href={categoryUrl}>#{category?.title}</a></div>{/if}
    <h1 class="quiz-title">{doc?.title ?? '読み込み中...'}</h1>
    {#if publishedLabel}<p class="quiz-date">公開日: {publishedLabel}</p>{/if}
  </header>

  {#if problemImageSet?.src}
    <div class="problem-image">
      <img src={problemImageSet.src} srcset={problemImageSet.srcset} alt="問題画像" width="100%" height="auto" />
    </div>
  {/if}

  {#if bodyHtml}
    <section class="body content-card">
      <div class="section-header"><h2>問題</h2></div>
      <div class="section-body">{@html bodyHtml}</div>
    </section>
  {/if}

  {#if hints.length > 0}
    <div class="hints-toggle">
      <button type="button" class="action-button hint-button" on:click={toggleHints}>
        {hintOpen ? 'ヒントを隠す' : 'ヒントを見る'}
      </button>
    </div>

    {#if hintOpen}
      <section class="hints content-card">
        <div class="section-header"><h2>ヒント</h2></div>
        <ul>
          {#each hints as hintText}
            <li class="pre-wrap">{hintText}</li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}

  <nav class="to-answer">
    <a class="action-button primary" href={answerPath}>正解ページへ進む →</a>
  </nav>

  {#if relatedQuizzes.length > 0}
    <RelatedQuizSection quizzes={relatedQuizzes} />
  {/if}
</main>

<style>
  /* 【ここがポイント】CSSで強制的に改行を有効にする設定 */
  .pre-wrap {
    white-space: pre-wrap; /* 改行コードをそのまま改行として表示 */
    word-wrap: break-word; /* 長い単語は折り返す */
  }

  /* 以下、デザイン調整 */
  .quiz-detail { max-width: 820px; margin: 24px auto 48px; padding: 0 16px 32px; display: flex; flex-direction: column; gap: 24px; }
  .quiz-header { text-align: center; background: linear-gradient(135deg, rgba(255,241,204,0.7), rgba(255,255,255,0.9)); border-radius: 24px; padding: 28px 24px; box-shadow: 0 18px 45px rgba(255,193,7,0.18); border: 1px solid rgba(250,204,21,0.35); }
  .quiz-title { font-size: clamp(1.8rem, 4vw, 2.4rem); color: #78350f; margin: 10px 0; font-weight: 800; }
  .category-chip { display: inline-block; padding: 0.35rem 1rem; border-radius: 999px; background: rgba(248,196,113,0.35); color: #78350f; font-weight: 700; text-decoration: none; }
  .problem-image { text-align: center; background: #fff; padding: 10px; border-radius: 24px; }
  .problem-image img { border-radius: 18px; max-width: 100%; height: auto; }
  .content-card { background: #fff; border-radius: 24px; padding: 24px; border: 1px solid rgba(248,196,113,0.32); }
  .section-header h2 { color: #92400e; margin: 0 0 16px; }
  
  /* ボタンのスタイル */
  .action-button { display: inline-flex; justify-content: center; align-items: center; padding: 1rem 2rem; border-radius: 999px; border: none; font-weight: bold; font-size: 1.1rem; cursor: pointer; text-decoration: none; width: 100%; max-width: 320px; margin: 0 auto; }
  .primary { background: linear-gradient(135deg, #facc15, #f97316); color: #78350f; box-shadow: 0 4px 12px rgba(249,115,22,0.3); }
  .hint-button { background: linear-gradient(135deg, #fde68a, #fcd34d); color: #92400e; }
  .hints-toggle, .to-answer { text-align: center; }
  
  /* ヒントリスト */
  .hints ul { padding-left: 1.2em; display: flex; flex-direction: column; gap: 1rem; line-height: 1.8; }
  .hints li { color: #444; }
</style>
