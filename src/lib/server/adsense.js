import { google } from 'googleapis';
import { env } from '$env/dynamic/private';
import { getGoogleAuth, ADSENSE_SCOPES } from './google-auth.js';

function parseAdSenseReport(data) {
	const rows = data.rows || [];
	const dailyRevenue = rows.map((row) => {
		const dateCell = row.cells?.[0]?.value ?? '';
		const earningsCell = row.cells?.[1]?.value ?? '0';
		const rpmCell = row.cells?.[2]?.value ?? '0';
		const impressionsCell = row.cells?.[3]?.value ?? '0';

		// DATE format: YYYYMMDD
		const label =
			dateCell.length === 8
				? `${dateCell.slice(4, 6)}/${dateCell.slice(6, 8)}`
				: dateCell;

		return {
			date: dateCell,
			label,
			earnings: parseFloat(earningsCell) || 0,
			rpm: parseFloat(rpmCell) || 0,
			impressions: parseInt(impressionsCell, 10) || 0
		};
	});

	const totalEarnings = dailyRevenue.reduce((s, d) => s + d.earnings, 0);

	return { dailyRevenue, totalEarnings };
}

export async function getAdSenseData() {
	const publisherId = env.ADSENSE_PUBLISHER_ID;
	if (!publisherId) throw new Error('ADSENSE_PUBLISHER_ID が未設定です');

	const auth = getGoogleAuth(ADSENSE_SCOPES);
	const adsense = google.adsense({ version: 'v2', auth });

	// pub-XXXXXXXX → accounts/pub-XXXXXXXX
	const account = publisherId.startsWith('accounts/')
		? publisherId
		: `accounts/${publisherId}`;

	const { data } = await adsense.accounts.reports.generate({
		account,
		dateRange: 'LAST_30_DAYS',
		metrics: ['ESTIMATED_EARNINGS', 'PAGE_VIEWS_RPM', 'IMPRESSIONS'],
		dimensions: ['DATE'],
		orderBy: ['+DATE']
	});

	return parseAdSenseReport(data);
}
