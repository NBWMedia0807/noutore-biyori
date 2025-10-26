import { redirect } from '@sveltejs/kit';

export const load = ({ url }) => {
  const hasTrailingSlash = url.pathname.endsWith('/');
  const basePath = hasTrailingSlash ? '/privacy-policy/' : '/privacy-policy';
  const target = new URL(basePath, url);
  target.search = url.search;
  target.hash = url.hash;

  const destination = `${target.pathname}${target.search}${target.hash}`;

  throw redirect(308, destination);
};
