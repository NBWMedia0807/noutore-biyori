import sanityClient from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';
const apiVersion =
  (typeof process !== 'undefined' && process.env && process.env.SANITY_API_VERSION) ||
  '2024-01-01';

export const client = sanityClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // `false` if you want to ensure fresh data
});

const builder = imageUrlBuilder(client);

export function urlFor(source) {
  return builder.image(source);
}
