import { createClient } from '@sanity/client'
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN,
  useCdn: false
})
const slug = process.argv[2]
if(!slug){ console.error('usage: node scripts/get_quiz_by_slug.mjs <slug>'); process.exit(1) }
const q=`*[_type=='quiz' && slug.current==$slug][0]{
  _id,_type,_updatedAt,title,"slug":slug.current,
  category->{title,"slug":slug.current},
  problemDescription,
  "hints": select(
    defined(hints) => hints,
    defined(hint) => [hint],
    []
  ),
  mainImage{asset->{url}}, answerImage{asset->{url}}, answerExplanation
}`
const doc = await client.fetch(q,{slug})
console.log(JSON.stringify(doc,null,2))
