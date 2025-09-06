// scripts/check-sanity.mjs
import sanityClient from '@sanity/client';

const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: '2025-01-01', // 日付は任意の新しいバージョン
  useCdn: false,
  token: process.env.SANITY_READ_TOKEN,
});

try {
  const doc = await client.fetch('*[_type=="quiz"][0]{_id}');
  if (!doc?._id) throw new Error('No quiz doc found');
  console.log('Sanity OK:', doc._id);
} catch (e) {
  console.error('Sanity NG:', e.message);
  process.exit(1);
}
