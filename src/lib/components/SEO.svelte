<script>
	import { page } from '$app/stores';
	import { SITE } from '$lib/config/site.js';
	// 【修正1】SvelteMeta ではなく MetaTags をインポート (v4以降の正しい名前)
	import { MetaTags } from 'svelte-meta-tags';

	/** @type {string} */
	export let title;
	/** @type {string} */
	export let description;
	/** @type {string} */
	export let image;
	/** @type {boolean} */
	export let noindex = false;

	// ページURLの生成
	$: canonical = $page.url.origin + $page.url.pathname;

	// タイトルの生成
	$: titleText = title ? `${title} | ${SITE.title}` : SITE.title;

	// 説明文の生成
	$: descriptionText = description || SITE.description;

	// 画像URLの生成
	$: imageUrl = image || SITE.image;

	// 【修正2】keywordsが存在するかチェックしてからjoinする (Codex指摘対応)
	$: keywordsArray = Array.isArray(SITE.keywords) ? SITE.keywords : [];
	$: keywordsString = keywordsArray.length > 0 ? keywordsArray.join(', ') : '';
</script>

<MetaTags
	title={titleText}
	description={descriptionText}
	canonical={canonical}
	keywords={keywordsString}
	noindex={noindex}
	openGraph={{
		title: titleText,
		description: descriptionText,
		url: canonical,
		type: 'website',
		images: [
			{
				url: imageUrl,
				alt: titleText,
				width: 1200,
				height: 630
			}
		],
		site_name: SITE.title
	}}
	twitter={{
		handle: SITE.twitterHandle,
		site: SITE.twitterHandle,
		cardType: 'summary_large_image',
		title: titleText,
		description: descriptionText,
		image: imageUrl,
		imageAlt: titleText
	}}
/>
