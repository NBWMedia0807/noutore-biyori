<script>
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  export let data;
  let { quiz, breadcrumbs = [] } = data;

  function renderPortableText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (content?._type === 'block') return renderPortableText([content]);
    if (Array.isArray(content)) {
      return content
        .filter((block) => block?._type === 'block')
        .map((block) => block?.children?.filter((child) => child?._type === 'span')?.map((child) => child.text).join('') || '')
        .join('\n');
    }
    return '';
  }

  $: explanationText = renderPortableText(quiz?.answerExplanation)?.trim();
</script>

<main>
  {#if quiz}
    <article class="quiz-article">
      <div class="breadcrumbs-wrapper">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <header class="quiz-header">
        <h1 class="quiz-title">{quiz.title}｜正解</h1>
      </header>

      {#if quiz.answerImage?.asset?.url}
        <div class="answer-image">
          <img src={quiz.answerImage.asset.url} alt="正解画像" loading="lazy" decoding="async" />
        </div>
      {/if}

      {#if explanationText}
        <section class="answer-explanation">
          <h2>解説</h2>
          <p>{explanationText}</p>
        </section>
      {/if}

      <nav class="back-nav">
        <a href={`/quiz/matchstick/article/${quiz._id}`}>問題ページに戻る</a>
      </nav>
    </article>
  {:else}
    <p>正解が見つかりませんでした。</p>
  {/if}
</main>

<style>
  main {
    max-width: 820px;
    width: 100%;
    margin: 40px auto;
    padding: 0 16px;
  }

  .quiz-article {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .breadcrumbs-wrapper {
    padding: 16px 16px 0;
  }

  .quiz-header {
    padding: 24px 16px 8px;
  }

  .quiz-title {
    font-size: 24px;
    line-height: 1.4;
    margin: 0;
  }

  .answer-image {
    padding: 0 16px 16px;
  }

  .answer-image img {
    width: 100%;
    height: auto;
    border-radius: 8px;
  }

  .answer-explanation {
    padding: 0 16px 24px;
  }

  .answer-explanation h2 {
    font-size: 20px;
    margin-bottom: 12px;
  }

  .answer-explanation p {
    white-space: pre-line;
    line-height: 1.8;
    margin: 0;
  }

  .back-nav {
    padding: 0 16px 24px;
  }

  .back-nav a {
    display: inline-block;
    padding: 12px 20px;
    background: var(--primary-yellow, #ffc107);
    color: #856404;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
  }

  .back-nav a:hover {
    opacity: 0.9;
  }

  @media (max-width: 640px) {
    main {
      max-width: none;
      margin: 0;
      padding: 0;
    }

    .quiz-article {
      border-radius: 0;
      box-shadow: none;
    }

    .breadcrumbs-wrapper,
    .quiz-header,
    .answer-image,
    .answer-explanation,
    .back-nav {
      padding-inline: 16px;
    }
  }
</style>
