#!/usr/bin/env node
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'quljge22',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN,
  useCdn: false
})

async function main(){
  const ids = await client.fetch(`*[_type in ['quiz','category']]{_id}`)
  if (!ids.length){
    console.log(JSON.stringify({ok:true, deleted:0},null,2));
    return
  }
  const tx = client.transaction()
  for (const {_id} of ids){ tx.delete(_id) }
  await tx.commit()
  console.log(JSON.stringify({ok:true, deleted: ids.length},null,2))
}

main().catch(e=>{ console.error(e); process.exit(1) })

