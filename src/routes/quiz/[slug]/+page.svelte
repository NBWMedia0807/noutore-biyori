<script>
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { createSanityImageSet } from '$lib/utils/images.js';

  export let data;
  const { quiz, breadcrumbs = [] } = data;

  function renderPortableText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (content?._type === 'block') return renderPortableText([content]);
    if (Array.isArray(content)) {
      return content
        .filter((b) => b?._type === 'block')
        .map((b) => b?.children?.filter((c) => c?._type === 'span')?.map((c) => c.text).join('') || '')
        .join('\n');
    }
    return '';
  }

  function textOrPortable(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return renderPortableText(content);
  }

  function normalizePortableArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  const FALLBACK_IMAGE = '/logo.svg';

  $: heroImageFallback =
    quiz?.problemImage?.asset?.url || quiz?.mainImage?.asset?.url || FALLBACK_IMAGE;
  $: heroImageSource = quiz?.problemImage?.asset?._ref
    ? quiz.problemImage
    : quiz?.mainImage?.asset?._ref
      ? quiz.mainImage
      : null;
  $: heroImageSet = heroImageSource
    ? createSanityImageSet(heroImageSource, {
        width: 960,
        height: 540,
        quality: 80,
        fallbackUrl: heroImageFallback
      })
    : heroImageFallback
      ? { src: heroImageFallback }
      : null;

  $: hintTexts = normalizePortableArray(quiz?.hints)
    .map((entry) => textOrPortable(entry)?.trim())
    .filter(Boolean);
</script>

<main style="max-width:800px;margin:24px auto;padding:16px;">
  <Breadcrumbs items={breadcrumbs} />
  <h1 style="text-align:center;margin-top:0;">{quiz.title}</h1>

  {#if heroImageSet?.src}
    <div style="text-align:center;margin:16px 0;">
      <picture>
        {#if heroImageSet.avifSrcset}
          <source srcset={heroImageSet.avifSrcset} type="image/avif" sizes="(min-width: 768px) 720px, 100vw" />
        {/if}
        {#if heroImageSet.webpSrcset}
          <source srcset={heroImageSet.webpSrcset} type="image/webp" sizes="(min-width: 768px) 720px, 100vw" />
        {/if}
        <img
          src={heroImageSet.src}
          srcset={heroImageSet.srcset}
          sizes="(min-width: 768px) 720px, 100vw"
          alt={quiz.title}
          loading="eager"
          fetchpriority="high"
          decoding="async"
          width="960"
          height="540"
          style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);"
        />
      </picture>
    </div>
  {/if}

  {#if textOrPortable(quiz.problemDescription)}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">問題の補足</h2>
      <p style="white-space:pre-line;line-height:1.8;">{textOrPortable(quiz.problemDescription)}</p>
    </section>
  {/if}

  {#if hintTexts.length}
    <section style="margin:16px 0;">
      <h2 style="font-size:1.25rem;margin:.5rem 0;">ヒント</h2>
      <div style="margin-top:.5rem;background:#f8f9fa;padding:1rem;border-left:4px solid #ffc107;border-radius:8px;">
        {#each hintTexts as hintText, index (index)}
          <p style="white-space:pre-line;line-height:1.8;">{hintText}</p>
        {/each}
      </div>
    </section>
  {/if}

  <div style="text-align:center;margin:24px 0;">
    <a href={`/quiz/${quiz.slug}/answer`} style="display:inline-block;background:#ffc107;color:#856404;text-decoration:none;padding:.75rem 1.5rem;border-radius:8px;font-weight:600;">正解を見る →</a>
  </div>
</main>
