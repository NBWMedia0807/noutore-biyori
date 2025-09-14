// scripts/mutate.mjs
// Write test for Sanity using environment variables
import { createClient } from '@sanity/client'

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'
const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN

if (!projectId) {
  console.error('SANITY_PROJECT_ID is not set')
  process.exit(1)
}
if (!token) {
  console.error('SANITY_WRITE_TOKEN or SANITY_AUTH_TOKEN is not set')
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token })

const now = new Date().toISOString()
const id = 'healthcheck.settings'

try {
  const res = await client.createOrReplace({
    _id: id,
    _type: 'settings',
    title: 'Healthcheck Settings',
    updatedAt: now
  })
  console.log('Write OK:', { _id: res._id, _rev: res._rev, updatedAt: now })
  process.exit(0)
} catch (err) {
  console.error('Write ERROR:', err?.message || String(err))
  process.exit(1)
}

