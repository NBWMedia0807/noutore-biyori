<script>
  import { page } from '$app/stores';

  // 基本設定（デフォルト値）
  // 外部ファイルに依存せず、ここで定義することでエラーを回避します
  const SITE_TITLE = '脳トレ日和';
  const SITE_DESCRIPTION = '楽しく脳を鍛えましょう';
  const SITE_URL = 'https://noutorebiyori.com';

  /** @type {string} */
  export let title = '';
  /** @type {string} */
  export let description = '';
  /** @type {string} */
  export let image = '';
  /** @type {boolean} */
  export let noindex = false;
  /** @type {string} */
  export let canonical = '';

  // URL生成ロジック
  $: currentPath = $page.url ? $page.url.pathname : '';
  $: canonicalUrl = canonical || (SITE_URL + currentPath);

  // 表示テキストの生成
  $: titleText = title ? `${title} | ${SITE_TITLE}` : SITE_TITLE;
  $: descriptionText = description || SITE_DESCRIPTION;
  // 画像がない場合はロゴなどを指定
  $: imageUrl = image || `${SITE_URL}/logo.svg`;
</script>

<svelte:head>
  <title>{titleText}</title>
  <meta name="description" content={descriptionText} />
  <link rel="canonical" href={canonicalUrl} />

  {#if noindex}
    <meta name="robots" content="noindex,nofollow" />
  {:else}
    <meta name="robots" content="index,follow" />
  {/if}

  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={titleText} />
  <meta property="og:description" content={descriptionText} />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:site_name" content={SITE_TITLE} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={titleText} />
  <meta name="twitter:description" content={descriptionText} />
  <meta name="twitter:image" content={imageUrl} />
</svelte:head>