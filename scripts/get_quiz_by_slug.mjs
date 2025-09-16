import { createClient } from '@sanity/client'

const args = process.argv.slice(2)
let identifier = null
let usePreviewDrafts = false
let dataset = process.env.SANITY_DATASET || 'production'

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]

  if (!arg.startsWith('-') && !identifier) {
    identifier = arg
    continue
  }

  if (arg === '--preview' || arg === '--draft' || arg === '-p') {
    usePreviewDrafts = true
    continue
  }

  if (arg === '--dataset' || arg === '-d') {
    const nextValue = args[index + 1]
    if (!nextValue || nextValue.startsWith('-')) {
      console.error('`--dataset` オプションには値が必要です。')
      process.exit(1)
    }
    dataset = nextValue
    index += 1
  }
}

if (!identifier) {
  console.error('usage: node scripts/get_quiz_by_slug.mjs <slug|id> [--preview] [--dataset <name>]')
  process.exit(1)
}

const perspective = usePreviewDrafts ? 'previewDrafts' : 'published'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset,
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token:
    process.env.SANITY_READ_TOKEN ||
    process.env.SANITY_API_READ_TOKEN ||
    process.env.SANITY_WRITE_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  perspective
})

const query = `*[_type=='quiz' && (slug.current==$identifier || _id==$identifier)]|order(_updatedAt desc)[0]{
  _id,
  _type,
  _updatedAt,
  title,
  "slug":slug.current,
  category->{title,"slug":slug.current},
  problemDescription,
  "hints": select(
    defined(hints) => hints,
    defined(hint) => [hint],
    []
  ),
  adCode1,
  adCode2,
  mainImage{asset->{url}},
  answerImage{asset->{url}},
  answerExplanation,
  closingMessage
}`

try {
  const doc = await client.fetch(query, { identifier })

  if (!doc) {
    console.error('指定したスラッグまたはIDのクイズが見つかりません。')
    process.exit(1)
  }

  console.error(`dataset=${dataset} perspective=${perspective}`)

  if (usePreviewDrafts) {
    const source = doc._id?.startsWith('drafts.') ? 'draft' : 'published'
    console.error(`プレビュー取得: ${source} を表示しています。`)
  }

  console.log(JSON.stringify(doc, null, 2))
} catch (error) {
  console.error('Sanityからの取得に失敗しました:', error.message)
  process.exit(1)
}
