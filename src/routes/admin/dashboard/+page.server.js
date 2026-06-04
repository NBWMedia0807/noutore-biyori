import { getGA4Data } from '$lib/server/ga4.js';
import { getAdSenseData } from '$lib/server/adsense.js';
import { getSearchConsoleData } from '$lib/server/search-console.js';
import { getTrendingArticles, getArticleStats } from '$lib/server/sanity-dashboard.js';
import { getCached, setCached } from '$lib/server/dashboard-cache.js';

export const prerender = false;

export const load = async ({ url }) => {
	const forceRefresh = url.searchParams.get('refresh') === '1';
	const cacheKey = 'dashboard-v1';

	if (!forceRefresh) {
		const cached = getCached(cacheKey);
		if (cached) return { ...cached, fromCache: true };
	}

	const [ga4Result, adsenseResult, searchResult, articlesResult, statsResult] =
		await Promise.allSettled([
			getGA4Data(),
			getAdSenseData(),
			getSearchConsoleData(),
			getTrendingArticles(),
			getArticleStats()
		]);

	const result = {
		ga4: ga4Result.status === 'fulfilled' ? ga4Result.value : null,
		adsense: adsenseResult.status === 'fulfilled' ? adsenseResult.value : null,
		searchConsole: searchResult.status === 'fulfilled' ? searchResult.value : null,
		trendingArticles: articlesResult.status === 'fulfilled' ? articlesResult.value : [],
		articleStats: statsResult.status === 'fulfilled' ? statsResult.value : null,
		errors: {
			ga4: ga4Result.status === 'rejected' ? ga4Result.reason?.message : null,
			adsense: adsenseResult.status === 'rejected' ? adsenseResult.reason?.message : null,
			searchConsole: searchResult.status === 'rejected' ? searchResult.reason?.message : null,
			articles: articlesResult.status === 'rejected' ? articlesResult.reason?.message : null
		},
		generatedAt: new Date().toISOString(),
		fromCache: false
	};

	setCached(cacheKey, result);
	return result;
};
