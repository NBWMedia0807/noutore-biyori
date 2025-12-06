<script>
	import { page } from '$app/stores';
	import { SITE } from '$lib/config/site.js';
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

	// 【修正点】キーワードが存在するかチェックしてから処理する（これで落ちません！）
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