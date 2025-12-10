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
  let firstHintItem;

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
  
  // 【修正ポイント1】ヒント処理の簡素化と改行対応
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
    // 古いフィールド 'hint' と新しいフィールド 'hints' の両方をチェック
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
      firstHintItem?.focus();
    }
  };

  // 【修正ポイント2】改行コードを <br> タグに変換する関数を追加
  const formatText = (text) => {
    if (!text) return '';
    // 改行コード (\n) を <br> タグに置換
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
      </
