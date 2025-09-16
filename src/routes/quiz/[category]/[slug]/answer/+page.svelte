<script>
  import { textOrPortable } from '$lib/portableText.js';

  export let data;
  const { quiz } = data;

  const FALLBACK_CLOSING_MESSAGE =
    'このシリーズは毎日更新。明日も新作を公開します。ブックマークしてまた挑戦してください！';

  $: answerExplanationText = textOrPortable(quiz?.answerExplanation);
  $: hasAnswerExplanation = Boolean(answerExplanationText?.trim());
  $: closingTextValue = textOrPortable(quiz?.closingMessage)?.trim();
  $: closingText = closingTextValue || FALLBACK_CLOSING_MESSAGE;
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

  {#if hasAnswerExplanation}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">解説</h2>
      <p style="white-space:pre-line;line-height:1.8;">{answerExplanationText}</p>
    </section>
  {/if}

  <section style="margin:16px 0;">
    <h2 style="font-size:1.25rem;margin:.5rem 0;">締め文</h2>
    <p style="white-space:pre-line;line-height:1.8;">{closingText}</p>
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
