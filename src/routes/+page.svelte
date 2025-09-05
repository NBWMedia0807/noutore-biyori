<script>
  export let data;
  import { urlFor } from '$lib/sanityPublic.js';
</script>

<h1 style="margin:16px 0;">脳トレ日和｜マッチ棒クイズ</h1>

{#if !data.quizzes?.length}
  <p>まだクイズが投稿されていません。</p>
{:else}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">
    {#each data.quizzes as q}
      <a href={`/quiz/matchstick/article/${q.slug}`} style="display:block;text-decoration:none;border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;">
        <img
          src={q.mainImage ? urlFor(q.mainImage).width(600).height(360).fit('crop').url() : '/fallback.png'}
          alt={q.title}
          loading="lazy"
          style="width:100%;height:160px;object-fit:cover"
        />
        <div style="padding:12px;">
          <h3 style="margin:0;font-size:16px;line-height:1.4;">{q.title}</h3>
        </div>
      </a>
    {/each}
  </div>
{/if}
