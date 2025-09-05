<script>
  export let data; // サーバー側(+page.server.js)から渡される props
  const { quizzes } = data;
</script>

<svelte:head>
  <title>クイズ一覧 - 脳トレ日和</title>
  <meta name="description" content="脳トレ日和のクイズ一覧ページです。" />
</svelte:head>

<main>
  <div class="section-header">
    <h1 class="section-title">🧩 クイズ一覧</h1>
  </div>

  {#if !quizzes || quizzes.length === 0}
    <p>まだクイズがありません。</p>
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        <article class="quiz-card">
          <a href="/quiz/{quiz.slug.current}" class="quiz-link">
            <div class="quiz-content">
              <h2 class="quiz-title">{quiz.title}</h2>
              <div class="quiz-category">
                <span class="category-tag">マッチ棒クイズ</span>
              </div>
            </div>
          </a>
        </article>
      {/each}
    </div>
  {/if}
</main>
