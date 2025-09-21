// src/lib/sanity.server.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { env } from '$env/dynamic/private';

const nodeEnv = env.NODE_ENV || 'production';
const previewFlag = (env.SANITY_PREVIEW_DRAFTS || env.SANITY_PREVIEW || '').toLowerCase() === 'true';

const tokenCandidates = [
  env.SANITY_READ_TOKEN,
  env.SANITY_WRITE_TOKEN,
  env.SANITY_AUTH_TOKEN,
  env.SANITY_DEPLOY_TOKEN,
  env.SANITY_API_TOKEN
];

const authToken = tokenCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || undefined;
const hasToken = Boolean(authToken);
const enablePreviewDrafts = hasToken && (previewFlag || nodeEnv !== 'production');

export const client = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET || 'production',
  apiVersion: env.SANITY_API_VERSION || '2024-01-01',
  token: authToken,
  useCdn: false,
  perspective: enablePreviewDrafts ? 'previewDrafts' : 'published'
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);
