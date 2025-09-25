<script>
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  export let data;
  const { quiz, breadcrumbs = [] } = data;

  const FALLBACK_CLOSING_MESSAGE =
    'このシリーズは毎日更新。明日も新作を公開します。ブックマークしてまた挑戦してください！';

  function renderPT(content){
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (content?._type === 'block') return renderPT([content]);
    if (Array.isArray(content)){
      return content
        .filter(b=>b?._type==='block')
        .map(b=> b.children?.filter(c=>c?._type==='span')?.map(c=>c.text).join('') || '')
        .join('\n');
    }
    return '';
  }

  $: closingText =
    renderPT(quiz?.closingMessage) ||
    (typeof quiz?.closingMessage === 'string' ? quiz.closingMessage : '');
</script>

<main style="max-width:800px;margin:24px auto;padding:16px;">
  <Breadcrumbs items={breadcrumbs} />
  <h1 style="text-align:center;margin-top:0;">{quiz.title}｜正解</h1>

  {#if quiz.answerImage?.asset?.url}
    <div style="text-align:center;margin:16px 0;">
      <img src={quiz.answerImage.asset.url} alt="正解画像" style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);" />
    </div>
  {/if}

  {#if renderPT(quiz.answerExplanation)}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">解説</h2>
      <p style="white-space:pre-line;line-height:1.8;">{renderPT(quiz.answerExplanation)}</p>
    </section>
  {/if}

  <section style="margin:16px 0;">
    <h2 style="font-size:1.25rem;margin:.5rem 0;">締め文</h2>
    <p style="white-space:pre-line;line-height:1.8;">{closingText || FALLBACK_CLOSING_MESSAGE}</p>
  </section>

  <div style="text-align:center;margin:24px 0;">
    <a
      href={`/quiz/${quiz.category?.slug}/${quiz.slug}`}
      style="display:inline-block;background:#ffc107;color:#856404;text-decoration:none;padding:.75rem 1.5rem;border-radius:8px;font-weight:600;"
    >
      ← 問題に戻る
    </a>
  </div>
</main>
