import { google } from 'googleapis';
import { env } from '$env/dynamic/private';

export const GA4_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];
export const ADSENSE_SCOPES = ['https://www.googleapis.com/auth/adsense.readonly'];
export const SEARCH_CONSOLE_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

export function getGoogleAuth(scopes) {
	const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
	const rawKey = env.GOOGLE_PRIVATE_KEY;

	if (!email || !rawKey) {
		throw new Error('Google サービスアカウントの環境変数が未設定です (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)');
	}

	return new google.auth.JWT({
		email,
		key: rawKey.replace(/\\n/g, '\n'),
		scopes
	});
}
