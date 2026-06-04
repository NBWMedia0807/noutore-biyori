import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const prerender = false;

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get('password')?.toString() ?? '';

		const adminPassword = env.ADMIN_PASSWORD;
		if (!adminPassword || password !== adminPassword) {
			return fail(401, { error: 'パスワードが違います' });
		}

		cookies.set('admin_auth', 'authenticated', {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 8 // 8時間
		});

		throw redirect(303, '/admin/dashboard');
	}
};
