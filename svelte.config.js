import vercel from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */

const config = {

  kit: {

    adapter: vercel(),

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