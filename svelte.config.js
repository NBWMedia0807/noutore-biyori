import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
       kit: {
               adapter: adapter(),
               files: {
                       appTemplate: 'src/app.html' // This path is relative to the project root
               }
       }
};

export default config;
