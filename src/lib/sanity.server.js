// src/lib/sanity.server.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { env } from '$env/dynamic/private';

export const client = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET || 'production',
  apiVersion: env.SANITY_API_VERSION || '2024-01-01',
  token: env.SANITY_READ_TOKEN,
  useCdn: false,
  perspective: 'published'
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);
