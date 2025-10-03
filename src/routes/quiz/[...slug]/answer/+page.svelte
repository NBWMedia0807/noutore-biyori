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
        <span class="section-icon" aria-hidden="true">📝</span>
        <h2>解説</h2>
      </div>
      <div class="section-body">{@html answerHtml}</div>
    </section>
  {/if}

  <nav class="back-nav">
    <a class="button button--ghost button--icon-leading back-button" href={questionPath}>
      <span aria-hidden="true">←</span>
      問題ページに戻る
    </a>
  </nav>

  <footer class="closing">
    <div class="closing-card">
      <span class="closing-icon" aria-hidden="true">🌟</span>
      <p>{closingText || closingDefault}</p>
    </div>
  </footer>
</main>

<style>
  .answer-page {
    max-width: 860px;
    margin: clamp(0.75rem, 2.4vw, 1.5rem) auto clamp(2.5rem, 5vw, 4rem);
    padding: 0 1.25rem clamp(1.5rem, 3vw, 2.25rem);
    display: flex;
    flex-direction: column;
    gap: clamp(1.5rem, 3vw, 2.6rem);
  }

  .quiz-header {
    text-align: center;
    background: linear-gradient(145deg, rgba(255, 240, 233, 0.95), rgba(255, 227, 214, 0.9));
    border-radius: var(--radius-xl);
    padding: clamp(1.8rem, 3.5vw, 2.6rem) clamp(1.6rem, 3vw, 2.4rem);
    box-shadow: var(--shadow-card-soft);
    border: 1px solid var(--color-border-subtle);
  }

  .quiz-meta {
    font-size: 0.92rem;
    letter-spacing: 0.08em;
    color: #b45309;
    font-weight: 700;
  }

  .quiz-title {
    font-size: clamp(1.8rem, 4.2vw, 2.45rem);
    line-height: 1.35;
    margin: 0.6rem 0 0.85rem;
    color: #9a3412;
    font-weight: 800;
  }

  .quiz-subtitle {
    font-size: clamp(1rem, 1.6vw, 1.1rem);
    color: var(--color-text-muted);
  }

  .answer-image {
    margin: 0 auto;
    text-align: center;
    padding: clamp(1rem, 2vw, 1.4rem);
    background: linear-gradient(145deg, rgba(255, 248, 239, 0.92), rgba(255, 236, 214, 0.9));
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border-subtle);
    box-shadow: var(--shadow-card-soft);
  }

  .answer-image img {
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 32px rgba(244, 114, 182, 0.14);
  }

  .content-card {
    background: linear-gradient(160deg, rgba(255, 249, 244, 0.98), rgba(255, 235, 223, 0.92));
  }

  .content-card > .section-header .section-icon {
    background: linear-gradient(135deg, rgba(255, 230, 236, 0.95), rgba(255, 209, 220, 0.95));
    box-shadow: var(--shadow-card-inner), 0 10px 18px rgba(244, 114, 182, 0.22);
  }

  .content-card > .section-header h2 {
    color: #b91c1c;
  }

  .content-card > .section-body {
    max-width: 62ch;
    font-size: clamp(1.02rem, 1.8vw, 1.1rem);
  }

  .content-card > .section-body :global(p) {
    margin: 0;
  }

  .content-card > .section-body :global(strong) {
    color: #b91c1c;
  }

  .back-nav {
    text-align: center;
  }

  .back-button {
    width: min(100%, 360px);
  }

  .closing {
    margin: 0;
  }

  .closing-card {
    margin: 0 auto;
    max-width: 640px;
    background: linear-gradient(145deg, rgba(255, 252, 246, 0.98), rgba(255, 239, 215, 0.92));
    border-radius: var(--radius-xl);
    padding: clamp(1.6rem, 3vw, 2.2rem) clamp(1.5rem, 3vw, 2.3rem);
    text-align: center;
    box-shadow: var(--shadow-card-soft);
    border: 1px solid var(--color-border-subtle);
    display: grid;
    gap: 0.85rem;
    color: var(--color-primary-600);
    line-height: 1.78;
    white-space: pre-line;
  }

  .closing-icon {
    font-size: 1.6rem;
  }

  @media (max-width: 640px) {
    .answer-page {
      padding-inline: 1rem;
    }

    .back-button {
      width: 100%;
    }
  }
</style>
