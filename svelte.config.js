// アダプターは環境変数 DEPLOY_TARGET で切り替える。
//   未設定 / vercel  → @sveltejs/adapter-vercel（現行本番。既定のまま）
//   cloudflare       → @sveltejs/adapter-cloudflare（Cloudflare Workers 移行用）
// 同じ main を両方でビルドできるので、Vercel への切り戻しは「DEPLOY_TARGET を外して再デプロイ」だけで済む。
// adapter-cloudflare は wrangler を読み込むため、Cloudflare ビルド時だけ動的 import する。
const target = (process.env.DEPLOY_TARGET || 'vercel').trim().toLowerCase();

if (!['vercel', 'cloudflare'].includes(target)) {
  throw new Error(`Unknown DEPLOY_TARGET "${target}". Use "vercel" (default) or "cloudflare".`);
}

const createAdapter = async () => {
  if (target === 'cloudflare') {
    const { default: cloudflare } = await import('@sveltejs/adapter-cloudflare');
    // 生成 Worker と、wrangler.jsonc が指定する手書きの入口を分ける。
    return cloudflare({ config: 'wrangler.adapter.jsonc' });
  }
  const { default: vercel } = await import('@sveltejs/adapter-vercel');
  return vercel({
    runtime: 'nodejs22.x'
  });
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: await createAdapter(),
    prerender: {
      handleHttpError: 'warn',
      handleMissingId: 'ignore',
      handleUnseenRoutes: 'ignore'
    },
    files: {
      appTemplate: 'src/app.html' // 必要ならカスタムapp.htmlを指定
    }
  }
};

export default config;
