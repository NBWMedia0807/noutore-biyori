import sanityClient from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { SANITY_DEFAULTS, warnMissingSanityEnv } from './sanityDefaults.js';

const projectId = import.meta.env?.VITE_SANITY_PROJECT_ID || SANITY_DEFAULTS.projectId;
const dataset = import.meta.env?.VITE_SANITY_DATASET || SANITY_DEFAULTS.dataset;
const apiVersion = import.meta.env?.VITE_SANITY_API_VERSION || SANITY_DEFAULTS.apiVersion;

warnMissingSanityEnv({
  source: 'client',
  projectId: import.meta.env?.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env?.VITE_SANITY_DATASET,
  apiVersion: import.meta.env?.VITE_SANITY_API_VERSION,
  logger: typeof console !== 'undefined' ? console : undefined
});

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
