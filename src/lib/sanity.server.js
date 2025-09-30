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

const projectId = env.SANITY_PROJECT_ID || 'quljge22';
const dataset = env.SANITY_DATASET || 'production';
const apiVersion = env.SANITY_API_VERSION || '2024-01-01';

export const sanityEnv = {
  projectId,
  dataset,
  apiVersion
};

const skipSanityFlag = (env.SKIP_SANITY || '').toString().toLowerCase();
const shouldBypassSanity = skipSanityFlag === '1' || skipSanityFlag === 'true';

if (!env.SANITY_PROJECT_ID) {
  console.warn('[sanity.server] SANITY_PROJECT_ID is missing; falling back to default projectId.');
}

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: authToken,
  useCdn: !hasToken,
  perspective: enablePreviewDrafts ? 'previewDrafts' : 'published'
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);

export const shouldSkipSanityFetch = () => shouldBypassSanity;
export const isSanityPreviewEnabled = () => enablePreviewDrafts;
