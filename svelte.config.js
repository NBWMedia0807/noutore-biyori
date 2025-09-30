import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x'
    }),
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
