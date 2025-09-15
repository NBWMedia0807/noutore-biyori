<script>
  export let data;
  import { urlFor } from '$lib/sanityPublic.js';
  
  function getImageUrl(quiz) {
    // 1) SSRで付与したサムネイルURLを最優先（Sanity由来のみ）
    if (quiz?.thumbnailUrl) return quiz.thumbnailUrl;
    // 2) 参照があれば builder で最適化URL
    if (quiz?.mainImage && quiz.mainImage.asset && !quiz.mainImage.asset.url) {
      try { return urlFor(quiz.mainImage).width(600).height(360).fit('crop').url(); } catch {}
    }
    // 3) そのままURLがあれば利用（Sanityの asset.url）
    if (quiz?.mainImage?.asset?.url) return quiz.mainImage.asset.url;
    // 4) 何も無ければ未表示（非Sanityのプレースホルダは使わない）
    return '';
  }
</script>

<h1 style="margin:16px 0;text-align:center;">新着記事</h1>

{#if !data.quizzes?.length}
  <p>まだクイズが投稿されていません。</p>
{:else}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">
    {#each data.quizzes.filter(q => q?.category?.slug) as q}
        <a href={`/quiz/${q.category.slug}/${q.slug}`}
           style="display:block;text-decoration:none;border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;">
        {#if getImageUrl(q)}
          <img
            src={getImageUrl(q)}
            alt={q.title}
            loading="lazy"
            style="width:100%;height:160px;object-fit:cover"
          />
        {/if}
        <div style="padding:12px;">
          <h3 style="margin:0;font-size:16px;line-height:1.4;">{q.title}</h3>
        </div>
      </a>
    {/each}
  </div>
{/if}
