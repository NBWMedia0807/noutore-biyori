import { google } from 'googleapis';
import { env } from '$env/dynamic/private';
import { getGoogleAuth, GA4_SCOPES } from './google-auth.js';

function formatDate(yyyymmdd) {
	// 'YYYYMMDD' → 'MM/DD'
	return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}

function parseGA4DailyReport(report) {
	if (!report?.rows) return [];
	return report.rows.map((row) => ({
		date: row.dimensionValues[0].value,
		label: formatDate(row.dimensionValues[0].value),
		pv: parseInt(row.metricValues[0].value, 10) || 0,
		dau: parseInt(row.metricValues[1].value, 10) || 0
	}));
}

function parseGA4SourceReport(report) {
	if (!report?.rows) return [];
	return report.rows.map((row) => ({
		source: row.dimensionValues[0].value,
		sessions: parseInt(row.metricValues[0].value, 10) || 0
	}));
}

function parseGA4TopPagesReport(report) {
	if (!report?.rows) return [];
	return report.rows.map((row) => ({
		path: row.dimensionValues[0].value,
		title: row.dimensionValues[1].value,
		pv: parseInt(row.metricValues[0].value, 10) || 0,
		avgDuration: parseFloat(row.metricValues[1].value) || 0
	}));
}

export async function getGA4Data() {
	const propertyId = env.GA4_PROPERTY_ID;
	if (!propertyId) throw new Error('GA4_PROPERTY_ID が未設定です');

	const auth = getGoogleAuth(GA4_SCOPES);
	const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });

	const { data } = await analyticsdata.properties.batchRunReports({
		property: `properties/${propertyId}`,
		requestBody: {
			requests: [
				{
					// 直近30日の日別 PV + DAU
					dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
					dimensions: [{ name: 'date' }],
					metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
					orderBys: [{ dimension: { dimensionName: 'date' } }]
				},
				{
					// トラフィックソース別セッション数（合計）
					dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
					dimensions: [{ name: 'sessionDefaultChannelGroup' }],
					metrics: [{ name: 'sessions' }],
					orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
				},
				{
					// 人気ページ TOP20
					dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
					dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
					metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
					orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
					limit: 20
				}
			]
		}
	});

	const [dailyReport, sourceReport, topPagesReport] = data.reports;

	const dailyMetrics = parseGA4DailyReport(dailyReport);
	const totalPv = dailyMetrics.reduce((s, d) => s + d.pv, 0);
	const avgDau = dailyMetrics.length
		? Math.round(dailyMetrics.reduce((s, d) => s + d.dau, 0) / dailyMetrics.length)
		: 0;

	return {
		dailyMetrics,
		trafficSources: parseGA4SourceReport(sourceReport),
		topPages: parseGA4TopPagesReport(topPagesReport),
		summary: { totalPv, avgDau }
	};
}
