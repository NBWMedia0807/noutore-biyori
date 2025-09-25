import { SITE } from '$lib/config/site.js';

const body = `User-agent: *
Allow: /
Sitemap: ${SITE.url}/sitemap.xml
`;

export const GET = async () => {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
