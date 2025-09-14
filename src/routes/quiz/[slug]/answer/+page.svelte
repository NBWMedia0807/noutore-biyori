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
    const s = typeof content === 'string' ? content : renderPortableText(content);
    return s || '';
  }

  // Sanity以外の文言は表示しない
</script>

<svelte:head>
  <title>{quiz.title}の正解 - 脳トレ日和</title>
</svelte:head>

<main style="max-width:800px;margin:24px auto;padding:16px;">
  <!-- ⑤ 正解画像 -->
  {#if quiz.answerImage?.asset?.url}
    <div style="text-align:center;margin:16px 0;">
      <img src={quiz.answerImage.asset.url} alt="正解画像" style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);" />
    </div>
  {/if}

  <!-- ⑥ 解説文 -->
  {#if textOrPortable(quiz.answerExplanation)}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">解説</h2>
      <p style="white-space:pre-line;line-height:1.8;">{textOrPortable(quiz.answerExplanation)}</p>
    </section>
  {/if}

  <!-- ⑦ 締め文（Sanityに入稿があれば表示） -->
  {#if textOrPortable(quiz.closingMessage)}
    <section style="margin:16px 0;">
      <p style="white-space:pre-line;line-height:1.8;">{textOrPortable(quiz.closingMessage)}</p>
    </section>
  {/if}

  <div style="margin-top:24px;text-align:center;">
    <a href={`/quiz/${quiz.slug}`} style="display:inline-block;background:#ffc107;color:#856404;text-decoration:none;padding:.75rem 1.5rem;border-radius:8px;font-weight:600;">← 問題へ戻る</a>
  </div>
</main>
