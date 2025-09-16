import { createClient } from '@sanity/client'

const args = process.argv.slice(2)
let slug = null
let usePreviewDrafts = false

for (const arg of args) {
  if (!arg.startsWith('-') && !slug) {
    slug = arg
  } else if (arg === '--preview' || arg === '--draft' || arg === '-p') {
    usePreviewDrafts = true
  }
}

if (!slug) {
  console.error('usage: node scripts/get_quiz_by_slug.mjs <slug> [--preview]')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
  perspective: usePreviewDrafts ? 'previewDrafts' : 'published'
})

const q=`*[_type=='quiz' && slug.current==$slug]|order(_updatedAt desc)[0]{
  _id,_type,_updatedAt,title,"slug":slug.current,
  category->{title,"slug":slug.current},
  problemDescription,
  "hints": select(
    defined(hints) => hints,
    defined(hint) => [hint],
    []
  ),
  mainImage{asset->{url}}, answerImage{asset->{url}}, answerExplanation,
  closingMessage
}`

try {
  const doc = await client.fetch(q, { slug })

  if (!doc) {
    console.error('指定したスラッグのクイズが見つかりません。')
    process.exit(1)
  }

  if (usePreviewDrafts) {
    const source = doc._id?.startsWith('drafts.') ? 'draft' : 'published'
    console.error(`プレビュー取得: ${source} を表示しています。`)
  }

  console.log(JSON.stringify(doc, null, 2))
} catch (error) {
  console.error('Sanityからの取得に失敗しました:', error.message)
  process.exit(1)
}
