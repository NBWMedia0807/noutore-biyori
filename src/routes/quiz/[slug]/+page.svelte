<script>
  export let data;
  const { quiz } = data;

  function renderPortableText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
      .filter((b) => b?._type === 'block')
      .map((b) => b.children?.filter((c) => c?._type === 'span')?.map((c) => c.text).join('') || '')
      .join('\n');
  }

  function textOrPortable(content) {
    // Studioの文字列 or Portable Text 配列をレンダリング
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((b) => b?._type === 'block')
        .map((b) => b.children?.filter((c) => c?._type === 'span')?.map((c) => c.text).join('') || '')
        .join('\n');
    }
    return '';
  }
</script>

<svelte:head>
  <title>{quiz.title} - 脳トレ日和</title>
</svelte:head>

<main style="max-width:800px;margin:24px auto;padding:16px;">
  <h1 style="text-align:center;margin-top:0;">{quiz.title}</h1>

  {#if quiz.category?.title}
    <div style="text-align:center;margin:.5rem 0 1rem 0;">
      <span class="category-tag" style="display:inline-block;background:#ffe08a;color:#856404;padding:.25rem .75rem;border-radius:20px;">{quiz.category.title}</span>
    </div>
  {/if}

  <!-- 問題画像 -->
  {#if quiz.mainImage?.asset?.url}
    <div style="text-align:center;margin:16px 0;">
      <img src={quiz.mainImage.asset.url} alt={quiz.title} style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);" />
    </div>
  {/if}

  <!-- 問題説明 -->
  {#if textOrPortable(quiz.problemDescription)}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">問題の補足</h2>
      <p style="white-space:pre-line;line-height:1.8;">{textOrPortable(quiz.problemDescription)}</p>
    </section>
  {/if}

  <!-- ④ ヒント（ここでページ区切り） -->
  {#if Array.isArray(quiz.hints) && quiz.hints.length}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">ヒント</h2>
      <div style="margin-top:.5rem;background:#f8f9fa;padding:1rem;border-left:4px solid #ffc107;border-radius:8px;">
        {#each quiz.hints as h}
          <p style="white-space:pre-line;line-height:1.8;">{textOrPortable(h)}</p>
        {/each}
      </div>
    </section>
  {:else if textOrPortable(quiz.hint)}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">ヒント</h2>
      <div style="margin-top:.5rem;background:#f8f9fa;padding:1rem;border-left:4px solid #ffc107;border-radius:8px;">
        <p style="white-space:pre-line;line-height:1.8;">{textOrPortable(quiz.hint)}</p>
      </div>
    </section>
  {/if}

  <!-- 2ページ目（正解）への誘導 -->
  <div style="text-align:center;margin:24px 0;">
    <a href={`/quiz/${quiz.slug}/answer`} style="display:inline-block;background:#ffc107;color:#856404;text-decoration:none;padding:.75rem 1.5rem;border-radius:8px;font-weight:600;">正解を見る →</a>
  </div>

  <!-- 補助情報 -->
  <p style="color:#6b7280;font-size:.9rem;">slug: <code>{quiz.slug}</code></p>
  {#if data.__dataSource}
    <p style="color:#9ca3af;font-size:.75rem;">__dataSource: {data.__dataSource}</p>
  {/if}
</main>
