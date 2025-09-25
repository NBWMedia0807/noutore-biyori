<script>
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let data;
  const quizzes = data.quizzes || [];
  const category = data.category || null;

  function formatDate(dateString) {
    const d = new Date(dateString);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  }

  function getImageSet(quiz) {
    if (!quiz) return null;
    const fallback = quiz.mainImage?.asset?.url || quiz.answerImage?.asset?.url || '';
    const source = quiz.mainImage?.asset?._ref ? quiz.mainImage : fallback;
    if (!source && !fallback) return null;
    return createSanityImageSet(source, { width: 600, height: 360, quality: 75, fallbackUrl: fallback });
  }
</script>

<section class="category-header" style="text-align:center;">
  <h1 class="category-title">{category ? category.title : 'カテゴリが見つかりません'}</h1>
  {#if category}
    <div class="quiz-count">全{quizzes.length}問</div>
  {/if}
</section>

{#if !category}
  <p style="text-align:center;">このカテゴリは存在しません。</p>
{:else if quizzes.length === 0}
  <p style="text-align:center;">まだ記事がありません。</p>
{:else}
  <div class="quiz-grid">
    {#each quizzes as q}
      {@const image = getImageSet(q)}
      <article class="quiz-card">
        <a href={`/quiz/${category.slug}/${q.slug}`} class="quiz-link">
          {#if image?.src}
            <picture class="quiz-img-wrapper">
              {#if image.avifSrcset}
                <source srcset={image.avifSrcset} type="image/avif" sizes="(min-width: 768px) 220px, 92vw" />
              {/if}
              {#if image.webpSrcset}
                <source srcset={image.webpSrcset} type="image/webp" sizes="(min-width: 768px) 220px, 92vw" />
              {/if}
              <img
                src={image.src}
                srcset={image.srcset}
                sizes="(min-width: 768px) 220px, 92vw"
                alt={q.title}
                class="quiz-img"
                loading="lazy"
                decoding="async"
                width="600"
                height="360"
              />
            </picture>
          {/if}
          <div class="quiz-content">
            <div class="quiz-date">{formatDate(q._createdAt)}</div>
            <h3 class="quiz-title">{q.title}</h3>
          </div>
        </a>
      </article>
    {/each}
  </div>
{/if}

<style>
  .quiz-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
  .quiz-card { border:1px solid #eee; border-radius:12px; overflow:hidden; background:#fff; }
  .quiz-img-wrapper { display:block; }
  .quiz-img { width:100%; height:160px; object-fit:cover; display:block; }
  .quiz-content { padding:12px; }
  .quiz-title { margin:0; font-size:16px; line-height:1.4; }
</style>

