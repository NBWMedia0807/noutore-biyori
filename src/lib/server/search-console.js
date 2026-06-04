import { google } from 'googleapis';
import { env } from '$env/dynamic/private';
import { getGoogleAuth, SEARCH_CONSOLE_SCOPES } from './google-auth.js';

function daysAgo(n) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

export async function getSearchConsoleData() {
	const siteUrl = env.SEARCH_CONSOLE_SITE_URL;
	if (!siteUrl) throw new Error('SEARCH_CONSOLE_SITE_URL が未設定です');

	const auth = getGoogleAuth(SEARCH_CONSOLE_SCOPES);
	const webmasters = google.webmasters({ version: 'v3', auth });

	const startDate = daysAgo(30);
	const endDate = daysAgo(3); // GSC は 2〜3日のラグがある

	const [queriesRes, pagesRes, dailyRes] = await Promise.all([
		// 上位クエリ TOP20
		webmasters.searchanalytics.query({
			siteUrl,
			requestBody: {
				startDate,
				endDate,
				dimensions: ['query'],
				rowLimit: 20,
				orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }]
			}
		}),
		// 上位ページ TOP20
		webmasters.searchanalytics.query({
			siteUrl,
			requestBody: {
				startDate,
				endDate,
				dimensions: ['page'],
				rowLimit: 20,
				orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }]
			}
		}),
		// 日別クリック数（直近30日）
		webmasters.searchanalytics.query({
			siteUrl,
			requestBody: {
				startDate,
				endDate,
				dimensions: ['date'],
				orderBy: [{ fieldName: 'date', sortOrder: 'ASCENDING' }]
			}
		})
	]);

	const parseRows = (rows, keyField) =>
		(rows || []).map((r) => ({
			key: r.keys[0],
			clicks: r.clicks,
			impressions: r.impressions,
			ctr: Math.round(r.ctr * 10000) / 100, // %
			position: Math.round(r.position * 10) / 10
		}));

	return {
		topQueries: parseRows(queriesRes.data.rows),
		topPages: parseRows(pagesRes.data.rows),
		dailyClicks: (dailyRes.data.rows || []).map((r) => ({
			date: r.keys[0],
			label: r.keys[0].slice(5), // 'MM-DD'
			clicks: r.clicks,
			impressions: r.impressions
		}))
	};
}
