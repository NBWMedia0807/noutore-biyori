<script>
  import { tick } from 'svelte';

  export let data;
  const { doc } = data;

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
    <p class="quiz-meta" aria-hidden="true">今日の脳トレ</p>
    <h1 class="quiz-title">{doc.title}</h1>
    <p class="quiz-subtitle">ひらめきスイッチを入れて、ゆったり挑戦しましょう。</p>
  </header>

  {#if doc.problemImage?.asset?.url}
    <div class="problem-image">
      <img src={doc.problemImage.asset.url} alt="問題画像" loading="lazy" decoding="async" />
    </div>
  {/if}

  {#if bodyHtml}
    <section class="body content-card">
      <div class="section-header">
        <span class="section-icon" aria-hidden="true">🧠</span>
        <h2>問題</h2>
      </div>
      <div class="section-body">{@html bodyHtml}</div>
    </section>
  {/if}

  {#if hints.length}
    <div class="hints-toggle">
      <button
        type="button"
        class="button button--secondary button--icon-leading hint-button"
        aria-expanded={hintOpen}
        aria-pressed={hintOpen}
        aria-controls={hintsId}
        on:click={toggleHints}
      >
        <span aria-hidden="true">💡</span>
        {hintOpen ? 'ヒントを隠す' : `ヒントを見る（${hints.length}件）`}
      </button>
    </div>

    {#if hintOpen}
      <section class="hints content-card" id={hintsId}>
        <div class="section-header">
          <span class="section-icon" aria-hidden="true">✨</span>
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
    <a class="button button--primary button--icon-trailing answer-button" href={answerPath}>
      正解ページへ進む
      <span class="sr-only">次のページへ</span>
      <span aria-hidden="true">→</span>
    </a>
  </nav>
</main>

<style>
  .quiz-detail {
    max-width: 860px;
    margin: clamp(0.75rem, 2.4vw, 1.5rem) auto clamp(2.5rem, 5vw, 4rem);
    padding: 0 1.25rem clamp(1.5rem, 3vw, 2.25rem);
    display: flex;
    flex-direction: column;
    gap: clamp(1.5rem, 3vw, 2.6rem);
  }

  .quiz-header {
    text-align: center;
    background: linear-gradient(145deg, rgba(255, 247, 224, 0.95), rgba(255, 236, 191, 0.9));
    border-radius: var(--radius-xl);
    padding: clamp(1.8rem, 3.5vw, 2.6rem) clamp(1.6rem, 3vw, 2.4rem);
    box-shadow: var(--shadow-card-soft);
    border: 1px solid var(--color-border-subtle);
  }

  .quiz-meta {
    font-size: 0.92rem;
    letter-spacing: 0.08em;
    color: var(--color-primary-600);
    font-weight: 700;
  }

  .quiz-title {
    font-size: clamp(1.85rem, 4.4vw, 2.5rem);
    line-height: 1.35;
    margin: 0.6rem 0 0.85rem;
    color: var(--color-primary-600);
    font-weight: 800;
  }

  .quiz-subtitle {
    font-size: clamp(1rem, 1.6vw, 1.1rem);
    color: var(--color-text-muted);
  }

  .problem-image {
    margin: 0 auto;
    text-align: center;
    padding: clamp(1rem, 2vw, 1.4rem);
    background: linear-gradient(145deg, rgba(255, 252, 240, 0.92), rgba(255, 243, 210, 0.9));
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border-subtle);
    box-shadow: var(--shadow-card-soft);
  }

  .problem-image img {
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 32px rgba(249, 115, 22, 0.16);
  }

  .content-card {
    background: linear-gradient(160deg, rgba(255, 252, 245, 0.98), rgba(255, 244, 223, 0.92));
  }

  .content-card > .section-body {
    max-width: 62ch;
    font-size: clamp(1.02rem, 1.8vw, 1.1rem);
  }

  .content-card > .section-body :global(p) {
    margin: 0;
  }

  .content-card > .section-body :global(strong) {
    color: var(--color-primary-600);
  }

  .content-card > .section-body :global(ul),
  .content-card > .section-body :global(ol) {
    margin: 0;
  }

  .hints-toggle {
    text-align: center;
  }

  .hint-button {
    width: min(100%, 360px);
  }

  .hints {
    background: linear-gradient(165deg, rgba(255, 251, 234, 0.95), rgba(255, 238, 204, 0.92));
  }

  .hints ul {
    margin: 0;
    padding-left: 1.2em;
    display: grid;
    gap: 0.85rem;
    font-size: clamp(1rem, 1.8vw, 1.08rem);
    line-height: 1.72;
  }

  .hints li {
    padding-left: 0.2em;
  }

  .to-answer {
    text-align: center;
  }

  .answer-button {
    width: min(100%, 420px);
  }

  @media (max-width: 640px) {
    .quiz-detail {
      padding-inline: 1rem;
    }

    .hint-button,
    .answer-button {
      width: 100%;
    }
  }

</style>
