<script>
  export let data;
  const { quiz } = data;

  function renderPT(content){
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)){
      return content
        .filter(b=>b?._type==='block')
        .map(b=> b.children?.filter(c=>c?._type==='span')?.map(c=>c.text).join('') || '')
        .join('\n');
    }
    return '';
  }
</script>

<svelte:head>
  <title>{quiz.title} 正解 - 脳トレ日和</title>
</svelte:head>

<main style="max-width:800px;margin:24px auto;padding:16px;">
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

  {#if data.__dataSource}
    <p style="color:#9ca3af;font-size:.75rem;">__dataSource: {data.__dataSource}</p>
  {/if}

  <div style="text-align:center;margin:24px 0;">
    <a href={`/quiz/${quiz.category?.slug}/${quiz.slug}`} style="text-decoration:none;">← 問題に戻る</a>
  </div>
</main>

