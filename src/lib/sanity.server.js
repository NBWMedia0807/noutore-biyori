// src/lib/sanity.server.js
import { createClient } from '@sanity/client';
import { env } from '$env/dynamic/private';
import { SANITY_DEFAULTS, warnMissingSanityEnv } from './sanityDefaults.js';

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

const projectId = env.SANITY_PROJECT_ID || SANITY_DEFAULTS.projectId;
const dataset = env.SANITY_DATASET || SANITY_DEFAULTS.dataset;
const apiVersion = env.SANITY_API_VERSION || SANITY_DEFAULTS.apiVersion;

warnMissingSanityEnv({
  source: 'server',
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET,
  apiVersion: env.SANITY_API_VERSION
});

const publicProjectId = env.VITE_SANITY_PROJECT_ID;
const publicDataset = env.VITE_SANITY_DATASET;

if (publicProjectId && publicProjectId !== projectId) {
  console.warn(
    `[sanity.server] SANITY_PROJECT_ID (${projectId}) と VITE_SANITY_PROJECT_ID (${publicProjectId}) が一致していません。` +
      ' Vercel やローカルの環境変数を再確認してください。'
  );
}

if (publicDataset && publicDataset !== dataset) {
  console.warn(
    `[sanity.server] SANITY_DATASET (${dataset}) と VITE_SANITY_DATASET (${publicDataset}) が一致していません。` +
      ' dataset が意図した値か確認してください。'
  );
}

const skipSanityFlag = (env.SKIP_SANITY || '').toString().toLowerCase();
const hasExplicitProjectId = typeof env.SANITY_PROJECT_ID === 'string' && env.SANITY_PROJECT_ID.trim().length > 0;
const shouldAutoBypass = !hasExplicitProjectId && !hasToken;
if (shouldAutoBypass) {
  console.info('[sanity.server] SKIP_SANITY inferred because SANITY_PROJECT_ID is not configured.');
}
const shouldBypassSanity = skipSanityFlag === '1' || skipSanityFlag === 'true' || shouldAutoBypass;

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

export const shouldSkipSanityFetch = () => shouldBypassSanity;
export const previewDraftsEnabled = enablePreviewDrafts;
