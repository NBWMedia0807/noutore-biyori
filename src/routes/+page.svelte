<script>
  export let data;
  import { urlFor } from '$lib/sanityPublic.js';
</script>

<h1 style="margin:16px 0;text-align:center;">新着記事</h1>

{#if !data.quizzes?.length}
  <p>まだクイズが投稿されていません。</p>
{:else}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">
    {#each data.quizzes as q}
      <a href={`/quiz/${q.slug}`} style="display:block;text-decoration:none;border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;">
        <img
          src={q.mainImage && urlFor(q.mainImage) ? urlFor(q.mainImage).width(600).height(360).fit('crop').url() : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjM2MCIgdmlld0JveD0iMCAwIDYwMCAzNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMzYwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjMwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCI+44Kk44Oh44O844K4</text>Cjwvc3ZnPgo='}
          alt={q.title}
          loading="lazy"
          style="width:100%;height:160px;object-fit:cover"
          on:error={(e) => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjM2MCIgdmlld0JveD0iMCAwIDYwMCAzNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMzYwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjMwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCI+44Kk44Oh44O844K4</text>Cjwvc3ZnPgo=';
          }}
        />
        <div style="padding:12px;">
          <h3 style="margin:0;font-size:16px;line-height:1.4;">{q.title}</h3>
        </div>
      </a>
    {/each}
  </div>
{/if}
