<script>
	import '../lib/styles/global.css';
	import { page } from '$app/stores';
	import { createPageSeo } from '$lib/seo.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { loadGtagOnce, sendPageView } from '$lib/ga';
	// 安全なSEOコンポーネントをインポート
	import SEO from '$lib/components/SEO.svelte';

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
	
	// パンくずリスト
	$: breadcrumbs = Array.isArray(currentPage?.data?.breadcrumbs)
		? currentPage.data.breadcrumbs
		: [];
		
	$: reviewMode = Boolean(data?.flags?.adsenseReviewMode);
	$: hasQuery = Boolean(currentPage?.url?.search && currentPage.url.search.length > 0);
	$: mainClass = typeof ui?.mainClass === 'string' ? ui.mainClass : '';
	let shouldSkipNextPageView = true;

	$: isErrorPage = !!currentPage.error;

	// SEO設定
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
	
	// noindex判定
	$: noindexPage = isErrorPage || hasQuery || seo.noindex === true;

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
</svelte:head>

<SEO
	title={seo.title}
	description={seo.description}
	canonical={seo.canonical}
	image={seo.image}
	noindex={noindexPage}
/>

{#if ui.showHeader !== false}
	<header data-review-mode={reviewMode}>
		<div class="header-content">
			<a href="/" class="logo-section" aria-label="脳トレ日和 トップページ">
				<img
					src="/logo.svg"
					alt="脳トレ日和"
					class="logo-image"
					width="80"
					height="80"
					decoding="async"
					fetchpriority="high"
				/>
				<div class="title-section">
					<h1>脳トレ日和</h1>
					<p class="subtitle">楽しく脳を鍛えましょう</p>
				</div>
			</a>
		</div>
	</header>
{/if}

{#if !ui.hideGlobalNavTabs}
	<nav class="main-nav">
		<div class="nav-container">
			<ul class="nav-menu">
				{#if data?.categories?.length}
					{#each data.categories as c}
						<li>
							<a href={`/category/${c.slug}`} class="nav-link" data-sveltekit-preload-data>{c.title}</a>
						</li>
					{/each}
				{/if}
				<li>
					<a href="/business-manner" class="nav-link" data-sveltekit-preload-data>ビジネスマナー</a>
				</li>
				<li>
					<a href="/number-quiz" class="nav-link" data-sveltekit-preload-data>数字クイズ</a>
				</li>
			</ul>
		</div>
	</nav>
{/if}

{#if !ui.hideBreadcrumbs && breadcrumbs.length}
	<div class="breadcrumbs-container">
		<Breadcrumbs items={breadcrumbs} />
	</div>
{/if}

<main class={mainClass}>
	<slot />
</main>

<footer data-review-mode={reviewMode}>
	<div class="footer-content">
		<p>&copy; 2025年9月 脳トレ日和</p>
		<p>毎日の脳トレで健康な生活を</p>
		<nav aria-label="法務および運営情報">
			<ul class="footer-links">
				<li><a href="/privacy-policy">プライバシーポリシー</a></li>
				<li><a href="/about">運営者情報</a></li>
				<li><a href="/contact">お問い合わせ</a></li>
				<li><a href="/terms">利用規約</a></li>
				<li><a href="/disclaimer">免責事項</a></li>
				<li><a href="/about#author-info">著者情報</a></li>
			</ul>
		</nav>
	</div>
</footer>

<style>
	.breadcrumbs-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}
</style>
