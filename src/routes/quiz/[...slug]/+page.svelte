<script>
  export let data;
  const { doc } = data;
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

  const bodyHtml = (() => {
    const fromBody = toHtml(doc?.body);
    if (fromBody.trim().length) return fromBody;
    const fromProblem = toHtml(doc?.problemDescription);
    return fromProblem;
  })();
  const hintList = (() => {
    const list = [];
    if (Array.isArray(doc?.hints)) list.push(...doc.hints);
    if (typeof doc?.hint === 'string') list.push(doc.hint);
    return list
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  })();
  const closingText = (() => {
    const text = toPlainText(doc?.closingMessage);
    return text.trim().length ? text.trim() : closingDefault;
  })();
  const answerPath = `/quiz/${doc?.slug ?? ''}/answer`;
</script>

<svelte:head>
  <link rel="canonical" href={data.canonicalPath} />
</svelte:head>

<main class="quiz-detail hide-chrome">
  <header class="quiz-header">
    <h1 class="quiz-title">{doc.title}</h1>
  </header>

  {#if doc.problemImage?.asset?.url}
    <div class="problem-image">
      <img src={doc.problemImage.asset.url} alt="問題画像" loading="lazy" decoding="async" />
    </div>
  {/if}

  {#if bodyHtml}
    <section class="body">
      <div>{@html bodyHtml}</div>
    </section>
  {/if}

  {#if hintList.length}
    <section class="hint">
      <h2>ヒント</h2>
      <ul>
        {#each hintList as hint, index (hint + index)}
          <li>{hint}</li>
        {/each}
      </ul>
    </section>
  {/if}

  <nav class="to-answer">
    <a class="btn" href={answerPath}>正解ページへ進む →</a>
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

  .quiz-detail {
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

  .problem-image {
    margin: 24px 0;
    text-align: center;
  }

  .problem-image img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  .body {
    margin: 24px 0;
    line-height: 1.8;
  }

  .hint {
    margin: 24px 0;
    padding: 16px;
    background: #fff8e1;
    border-radius: 12px;
    border: 1px solid #ffe082;
  }

  .hint h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  .hint ul {
    margin: 0;
    padding-left: 1.2em;
  }

  .hint li {
    margin-bottom: 6px;
    line-height: 1.6;
  }

  .to-answer {
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
