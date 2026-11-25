import { SITE } from '$lib/config/site.js';
import { isWorkersDevHost, STAGING_ROBOTS_TXT } from '$lib/staging-host.js';

const productionBody = `User-agent: *
Allow: /
Sitemap: ${SITE.url}/sitemap.xml
`;

export const GET = async ({ url }) => {
  const staging = isWorkersDevHost(url.hostname);
  return new Response(staging ? STAGING_ROBOTS_TXT : productionBody, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // 試験ホストの robots はホストごとに内容が違うので共有キャッシュしない
      'Cache-Control': staging ? 'no-store' : 'public, max-age=3600'
    }
  });
};
