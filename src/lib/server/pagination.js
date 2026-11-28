import { redirect } from '@sveltejs/kit';

export const resolveRequestedPage = (url) => {
  const value = url.searchParams.get('page');
  const digits = value?.match(/^\d+/)?.[0];
  const page = Number(digits);
  if (!Number.isFinite(page) || page < 1) return 1;

  if (digits !== value) {
    const params = new URLSearchParams(url.search);
    params.set('page', digits);
    throw redirect(301, `${url.pathname}?${params}`);
  }

  return page;
};
