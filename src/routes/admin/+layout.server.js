import { redirect } from '@sveltejs/kit';

export const prerender = false;
export const ssr = true;

export const load = ({ cookies, url }) => {
	if (url.pathname === '/admin/login') return {};

	const auth = cookies.get('admin_auth');
	if (auth !== 'authenticated') {
		throw redirect(303, '/admin/login');
	}
	return {};
};
