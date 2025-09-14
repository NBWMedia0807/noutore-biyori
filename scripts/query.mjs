// scripts/query.mjs
// Read test for Sanity using environment variables
import { createClient } from '@sanity/client'

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'
const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01'
const token = process.env.SANITY_READ_TOKEN

if (!projectId) {
  console.error('SANITY_PROJECT_ID is not set')
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token })

try {
  const doc = await client.fetch('*[0]{_id,_type,_updatedAt}')
  console.log('Read OK:', doc || null)
  process.exit(0)
} catch (err) {
  console.error('Read ERROR:', err?.message || String(err))
  process.exit(1)
}

