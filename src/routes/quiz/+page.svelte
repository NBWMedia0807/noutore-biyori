<script>
  // サーバから受け取ったデータだけを使う（ブラウザで fetch しない）
  export let data;
  const { quizzes = [] } = data;
</script>

<svelte:head>
  <title>クイズ一覧 - 脳トレ日和</title>
  <meta name="description" content="脳トレ日和のクイズ一覧ページです。マッチ棒クイズや間違い探しなど、楽しいクイズに挑戦しましょう。" />
</svelte:head>

<main>
  <div class="section-header">
    <h1 class="section-title">🧩 クイズ一覧</h1>
  </div>

  {#if quizzes.length === 0}
    <p>まだクイズが投稿されていません。</p>
  {:else}
    <div class="quiz-grid">
      {#each quizzes as quiz}
        <article class="quiz-card">
          <!-- 🔗 slug で遷移（_id ではなく） -->
          <a class="quiz-link" href={"/quiz/" + quiz.slug}>
            <div class="quiz-content">
              <h2 class="quiz-title">{quiz.title}</h2>

              {#if quiz?.mainImage?.asset?.url}
                <img
                  src={quiz.mainImage.asset.url}
                  alt={quiz.title}
                  style="width:100%;height:auto;border-radius:12px;margin:8px 0;"
                />
              {/if}

              <div class="quiz-meta">
                <span class="quiz-type">🧩 クイズ</span>
                <span class="quiz-action">挑戦する →</span>
              </div>
            </div>
          </a>
        </article>
      {/each}
    </div>
  {/if}
</main>

<style>
  main { max-width: 1000px; margin: 0 auto; padding: 1rem; }
  .section-header { text-align: center; margin-bottom: 2rem; }
  .section-title { font-size: 2rem; font-weight: 700; color: var(--dark-gray); margin: 0; }
  .quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; margin-top: 2rem; }
  .quiz-card { background: var(--white); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.1); overflow: hidden; transition: .3s; border-left: 4px solid var(--primary-yellow); }
  .quiz-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,.15); }
  .quiz-link { text-decoration: none; color: inherit; display: block; }
  .quiz-content { padding: 1.5rem; }
  .quiz-title { font-size: 1.25rem; font-weight: 700; color: var(--dark-gray); margin-bottom: .75rem; line-height: 1.4; }
  .quiz-meta { display: flex; justify-content: space-between; align-items: center; font-size: .9rem; color: var(--medium-gray); }
  .quiz-action { color: var(--primary-yellow); font-weight: 600; }
  @media (max-width: 768px) { .quiz-grid { grid-template-columns: 1fr; gap: 1.5rem; } .quiz-content { padding: 1rem; } .section-title { font-size: 1.5rem; } }
</style>
