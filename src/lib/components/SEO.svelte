<script>
	import { page } from '$app/stores';

	// SITE設定の読み込み（エラーガード付き）
	let SITE = { title: '脳トレ日和', description: '', keywords: [] };
	import('$lib/config/site.js').then((module) => {
		if (module.SITE) SITE = module.SITE;
	}).catch(() => {});

	/** @type {string} */
	export let title = '';
	/** @type {string} */
	export let description = '';
	/** @type {string} */
	export let image = '';
	/** @type {boolean} */
	export let noindex = false;

	// 各種テキストの生成
	$: canonical = $page.url ? ($page.url.origin + $page.url.pathname) : '';
	$: titleText = title ? `${title} | ${SITE.title}` : SITE.title;
	$: descriptionText = description || SITE.description || '';
	$: imageUrl = image || SITE.image || '';
	
	// キーワード配列の処理
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