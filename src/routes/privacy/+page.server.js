import { redirect } from '@sveltejs/kit';
import { resolvePrivacyRedirect } from '$lib/server/privacy-redirect.js';

// 旧URL /privacy → /privacy-policy へ 308（理由は $lib/server/privacy-redirect.js）
/** @type {import('./$types').PageServerLoad} */
export const load = ({ url }) => {
  redirect(308, resolvePrivacyRedirect(url));
};
