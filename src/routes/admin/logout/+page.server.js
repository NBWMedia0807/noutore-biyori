import { redirect } from '@sveltejs/kit';

export const prerender = false;

export const load = ({ cookies }) => {
	cookies.delete('admin_auth', { path: '/' });
	throw redirect(303, '/admin/login');
};
