import sanityClient from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = sanityClient({
  projectId: 'quljge22',
  dataset: 'production',
  apiVersion: '2021-10-21', // use current date (YYYY-MM-DD) to specify API version
  useCdn: true, // `false` if you want to ensure fresh data
});

const builder = imageUrlBuilder(client);

export function urlFor(source) {
  return builder.image(source);
}


