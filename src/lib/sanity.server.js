// src/lib/sanity.server.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { env } from '$env/dynamic/private';

const nodeEnv = env.NODE_ENV || 'production';
const previewFlag = (env.SANITY_PREVIEW_DRAFTS || env.SANITY_PREVIEW || '').toLowerCase() === 'true';
const dataset = env.SANITY_DATASET || env.PUBLIC_SANITY_DATASET || 'production';
const token = [
  env.SANITY_READ_TOKEN,
  env.SANITY_API_READ_TOKEN,
  env.SANITY_PREVIEW_TOKEN,
  env.SANITY_WRITE_TOKEN,
  env.SANITY_API_WRITE_TOKEN
].find((value) => typeof value === 'string' && value.length > 0);
const hasToken = Boolean(token);
const enablePreviewDrafts = hasToken && (previewFlag || nodeEnv !== 'production');

export const client = createClient({
  projectId: env.SANITY_PROJECT_ID || env.PUBLIC_SANITY_PROJECT_ID,
  dataset,
  apiVersion: env.SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
  perspective: enablePreviewDrafts ? 'previewDrafts' : 'published'
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);
