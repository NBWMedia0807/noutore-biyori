<script>
	import '../lib/styles/global.css';
	import { page } from '$app/stores';
	import { createPageSeo } from '$lib/seo.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { loadGtagOnce, sendPageView } from '$lib/ga';
	// import SEO from '$lib/components/SEO.svelte'; // ← エラー原因なので削除

	export let data;

	const gaMeasurementId = import.meta.env.VITE_GA_ID;
	const gaBootstrapScript = gaMeasurementId
		? [
				'window.dataLayer = window.dataLayer || [];',
				'function gtag(){window.dataLayer.push(arguments);}',
				'window.gtag = gtag;',
				"gtag('js', new Date());",
				`gtag('config', ${JSON.stringify(gaMeasurementId)}, {"send_page_view": false});`
			].join('')
		: '';

	$: currentPage = $page;
	$: ui = currentPage?.data?.ui ?? {};
	$: breadcrumbs = Array.isArray(currentPage?.data?.breadcrumbs)
		? currentPage.data.breadcrumbs
		: [];
	$: reviewMode = Boolean(data?.flags?.adsenseReviewMode);
	$: hasQuery = Boolean(currentPage?.url?.search && currentPage.url.search.length > 0);
	$: mainClass = typeof ui?.mainClass === 'string' ? ui.mainClass : '';
	let shouldSkipNextPageView = true;

	$: isErrorPage = !!currentPage.error;

	// SEO object from page data, with fallbacks
	$: fallbackSeo = createPageSeo({
		path: currentPage?.url?.pathname ?? '/',
		appendSiteName: false
	});
	$: providedSeo = currentPage?.data?.seo ?? {};
	$: seo = {
		...fallbackSeo,
		...providedSeo,
		title: isErrorPage ? 'エラー' : providedSeo.title ?? fallbackSeo.title,
		description: isErrorPage ? 'ページが見つかりませんでした。' : providedSeo.description ?? fallbackSeo.description,
		canonical: providedSeo.canonical ?? fallbackSeo.canonical,
		image: providedSeo.image ?? fallbackSeo.image,
		type: providedSeo.type ?? fallbackSeo.type,
		jsonld: Array.isArray(providedSeo.jsonld)
			? providedSeo.jsonld.filter(Boolean)
			: fallbackSeo.jsonld
	};
	
	// Determine if the page should be noindexed
	$: noindexPage = isErrorPage || hasQuery || seo.noindex === true;

	// サイト名（共通設定）
	const SITE_NAME = '脳トレ日和';

	$: if (typeof document !== 'undefined') {
		document.documentElement.dataset.reviewMode = reviewMode ? 'true' : 'false';
		document.body.dataset.reviewMode = reviewMode ? 'true' : 'false';
	}

	onMount(() => {
		loadGtagOnce();

		if (typeof window !== 'undefined') {
			sendPageView(`${window.location.pathname}${window.location.search}`);
		}

		afterNavigate((navigation) => {
			if (shouldSkipNextPageView) {
				shouldSkipNextPageView = false;
				return;
			}

			const path = navigation?.to?.url?.pathname ?? window.location.pathname;
			const search = navigation?.to?.url?.search ?? window.location.search;
			sendPageView(`${path}${search}`);
		});
	});
</script>

<svelte:head>
	{#if gaMeasurementId}
		<script
			id="ga4-gtag-script"
			async
			src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
		></script>
		{#if gaBootstrapScript}
			<script id="ga4-gtag-script-inline">
				{@html gaBootstrapScript}
			</script>
		{/if}
	{/if}
	<script
		async
		src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2298313897414846"
		crossorigin="anonymous"
	></script>
	<link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
	<link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />

	<title>{seo.title ? `${seo.title} | ${SITE_NAME}` : SITE_NAME}</title>
	<meta name="description" content={seo.description} />
	<link rel="canonical" href={seo.canonical} />

	{#if noindexPage}
		<meta name="robots" content="noindex,nofollow" />
	{:else}
		<meta name="robots" content="index,follow" />
	{/if}

	<meta property="og:type" content={seo.type || 'website'} />
	<meta property="og:url" content={seo.canonical} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:site_name" content={SITE
