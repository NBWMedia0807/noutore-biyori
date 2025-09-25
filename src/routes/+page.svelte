<script>
  export let data;
  import { createSanityImageSet } from '$lib/utils/images.js';
  
  let quizzes = [];
  let visibleQuizzes = [];

  $: quizzes = Array.isArray(data?.quizzes) ? data.quizzes : [];
  $: visibleQuizzes = quizzes.filter((quiz) => quiz?.category?.slug && quiz?.slug);

  function getImageSet(quiz) {
    if (!quiz) return null;
    const fallback = quiz.thumbnailUrl || quiz.mainImage?.asset?.url || '';
    const source = quiz.mainImage?.asset?._ref ? quiz.mainImage : fallback;
    if (!source && !fallback) return null;
    return createSanityImageSet(source, { width: 600, height: 360, fallbackUrl: fallback, quality: 75 });
  }
</script>

<h1 style="margin:16px 0;text-align:center;">新着記事</h1>

{#if !visibleQuizzes.length}
  <p>まだクイズが投稿されていません。</p>
{:else}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">
    {#each visibleQuizzes as q}
      {@const image = getImageSet(q)}
      <a
        href={`/quiz/${q.category.slug}/${q.slug}`}
        style="display:block;text-decoration:none;border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;"
      >
        {#if image?.src}
          <picture>
            {#if image.avifSrcset}
              <source srcset={image.avifSrcset} type="image/avif" sizes="(min-width: 768px) 220px, 90vw" />
            {/if}
            {#if image.webpSrcset}
              <source srcset={image.webpSrcset} type="image/webp" sizes="(min-width: 768px) 220px, 90vw" />
            {/if}
            <img
              src={image.src}
              srcset={image.srcset}
              sizes="(min-width: 768px) 220px, 90vw"
              alt={q.title}
              loading="lazy"
              decoding="async"
              width="600"
              height="360"
              style="width:100%;height:160px;object-fit:cover"
            />
          </picture>
        {/if}
        <div style="padding:12px;">
          <h3 style="margin:0;font-size:16px;line-height:1.4;">{q.title}</h3>
        </div>
      </a>
    {/each}
  </div>
{/if}
