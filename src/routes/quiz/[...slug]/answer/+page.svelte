<script>
  export let data;
  const { quiz } = data;
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
</script>

<svelte:head>
  <link rel="canonical" href={data.canonicalPath} />
</svelte:head>

<main class="answer-page hide-chrome">
  <header class="quiz-header">
    <h1 class="quiz-title">{quiz.title}｜正解</h1>
  </header>

  {#if quiz.answerImage?.asset?.url}
    <div class="answer-image">
      <img src={quiz.answerImage.asset.url} alt="正解画像" loading="lazy" decoding="async" />
    </div>
  {/if}

  {#if answerHtml}
    <section class="answer-explanation">
      <h2>解説</h2>
      <div>{@html answerHtml}</div>
    </section>
  {/if}

  <nav class="back-nav">
    <a class="btn" href={questionPath}>問題ページに戻る</a>
  </nav>

  <footer class="closing">
    <p>{closingText}</p>
  </footer>
</main>

<style>
  :global(.global-nav),
  :global(.breadcrumbs) {
    display: none !important;
  }

  .answer-page {
    max-width: 820px;
    margin: 40px auto;
    padding: 0 16px;
  }

  .quiz-title {
    font-size: 24px;
    line-height: 1.4;
    margin: 0 0 12px;
    text-align: center;
  }

  .answer-image {
    margin: 24px 0;
    text-align: center;
  }

  .answer-image img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  .answer-explanation {
    margin: 24px 0;
    line-height: 1.8;
  }

  .answer-explanation h2 {
    margin: 0 0 12px;
    font-size: 20px;
    text-align: center;
  }

  .back-nav {
    margin: 28px 0;
    text-align: center;
  }

  .btn {
    display: inline-block;
    padding: 10px 20px;
    border-radius: 999px;
    border: 1px solid #ddd;
    text-decoration: none;
    font-weight: 600;
    background: #fff;
  }

  .closing {
    margin: 32px 0;
    text-align: center;
    opacity: 0.9;
    white-space: pre-line;
  }
</style>
