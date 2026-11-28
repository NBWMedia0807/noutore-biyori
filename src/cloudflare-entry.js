// Cloudflare の入口。adapter が生成した Worker の外側で、全応答（静的ファイル含む）を整える。
// ads.txt や画像は SvelteKit の hooks を通らないため、ここで試験ホストの noindex と HSTS を足す。
import worker from '../.svelte-kit/cloudflare/_worker.js';
import { handleImageProxy } from './lib/server/image-proxy.js';
import { withHsts } from './lib/server/edge-cache.js';
import { applyWorkersDevRobots } from './lib/staging-host.js';

export default {
  async fetch(request, env, ctx) {
    const response = await handleImageProxy(request, { waitUntil: ctx?.waitUntil?.bind(ctx) })
      ?? await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    return applyWorkersDevRobots(withHsts(response, url), url.hostname);
  }
};
