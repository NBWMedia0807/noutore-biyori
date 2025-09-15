#!/usr/bin/env node
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'quljge22',
  dataset: process.env.SANITY_DATASET || 'live',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN,
  useCdn: false
})

async function ensureCategory(title, slug){
  const found = await client.fetch(`*[_type=='category' && (slug.current==$slug || title==$title)][0]{_id}`,{slug,title})
  if (found) return found._id
  const created = await client.create({ _type:'category', title, slug:{_type:'slug', current:slug} })
  return created._id
}

async function main(){
  const match = await ensureCategory('マッチ棒クイズ','matchstick')
  const diff  = await ensureCategory('間違い探し','spot-the-difference')
  console.log(JSON.stringify({ ok:true, dataset: client.config().dataset, categories:{match, diff} }, null, 2))
}

main().catch(e=>{ console.error(e); process.exit(1) })

