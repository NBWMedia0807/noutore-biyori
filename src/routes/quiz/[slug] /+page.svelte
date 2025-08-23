<script>
  export let data;
  const { quiz } = data;
</script>

<article>
  <h1>{quiz.title}</h1>

  {#if quiz?.mainImage?.asset?.url}
    <img src={quiz.mainImage.asset.url} alt={quiz.title} style="max-width:100%;height:auto" />
  {/if}

  {#if quiz?.body}
    {@html quiz.body}  <!-- Portable Textなら後で既存レンダラに差し替え -->
  {/if}
</article>