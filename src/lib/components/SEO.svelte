<script>
	import { page } from '$app/stores';
	// SEO設定を確実に読み込む（静的インポート）
	import { SITE } from '$lib/config/site.js';

	/** @type {string} */
	export let title = '';
	/** @type {string} */
	export let description = '';
	/** @type {string} */
	export let image = '';
	/** @type {boolean} */
	export let noindex = false;

	// ページURLの生成（$page.urlが存在しない場合の安全対策付き）
	$: canonical = $page.url ? ($page.url.origin + $page.url.pathname) : '';

	// タイトルの生成
	$: titleText = title ? `${title} | ${SITE.title}` : SITE.title;

	// 説明文の生成
	$: descriptionText = description || SITE.description || '';

	// 画像URLの生成
	$: imageUrl = image || SITE.image || '';
	
	// キーワード配列の処理（Codex指摘対応：配列チェックを入れる）
	$: keywordsArray = Array.isArray(SITE.keywords) ? SITE.keywords : [];
	$: keywordsString = keywordsArray.join(', ');
</script>

<svelte:head>
	<title>{titleText}</title>
	<meta name="description" content={descriptionText} />
	<meta name="keywords" content={keywordsString} />
	<link rel="canonical" href={canonical} />

	{#if noindex}
		<meta name="robots" content="noindex,nofollow" />
	{:else}
		<meta name="robots" content="index,follow" />
	{/if}

	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={titleText} />
	<meta property="og:description" content={descriptionText} />
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
	{/if}
	<meta property="og:site_name" content={SITE.title} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={titleText} />
	<meta name="twitter:description" content={descriptionText} />
	{#if imageUrl}
		<meta name="twitter:image" content={imageUrl} />
	{/if}
</svelte:head>