<script>
  export let data;
  const { quiz } = data;
</script>

<svelte:head>
  <title>{quiz.title} - 脳トレ日和</title>
</svelte:head>

<article class="container">
  <h1 class="title">{quiz.title}</h1>

  {#if quiz.mainImage?.asset?.url}
    <img
      src={quiz.mainImage.asset.url}
      alt={quiz.title}
      class="main-image"
    />
  {/if}

  {#if quiz.body}
    <div class="body" aria-label="本文">
      {@html quiz.body}
    </div>
  {/if}

  <p class="back"><a href="/quiz">← クイズ一覧に戻る</a></p>
</article>

<style>
  .container { max-width: 900px; margin: 0 auto; padding: 1rem; }
  .title { font-size: 1.8rem; font-weight: 700; margin-bottom: 1rem; }
  .main-image { max-width: 100%; height: auto; border-radius: 12px; margin: 1rem 0; }
  .body { line-height: 1.8; color: var(--dark-gray); }
  .back { margin-top: 2rem; }
</style>
