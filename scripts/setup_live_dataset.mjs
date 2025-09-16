#!/usr/bin/env node
import { createClient } from '@sanity/client'

const projectId = process.env.SANITY_PROJECT_ID || 'quljge22'
const dataset = 'live'
const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN

if (!token) {
  console.error('Missing SANITY_WRITE_TOKEN / SANITY_AUTH_TOKEN')
  process.exit(1)
}

async function ensureDataset() {
  const url = `https://api.sanity.io/v1/projects/${projectId}/datasets/${dataset}`
  const res = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ aclMode: 'private' }) })
  if (!res.ok && res.status !== 409) {
    const t = await res.text()
    throw new Error(`Dataset create failed: ${res.status} ${t}`)
  }
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false })

async function uploadImageFromUrl(url, filename) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Fetch image failed ${url}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  const asset = await client.assets.upload('image', buf, { filename })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

function pt(text) {
  return [ { _type: 'block', style: 'normal', markDefs: [], children: [ { _type: 'span', marks: [], text } ] } ]
}

async function ensureCategory(title, slug) {
  const found = await client.fetch(`*[_type=='category' && (slug.current==$slug || title==$title)][0]{_id}`, { slug, title })
  if (found) return found._id
  const created = await client.create({ _type: 'category', title, slug: { _type: 'slug', current: slug } })
  return created._id
}

async function seed() {
  await ensureDataset()

  const matchId = await ensureCategory('マッチ棒クイズ','matchstick')
  const diffId  = await ensureCategory('間違い探し','spot-the-difference')

  // Assets from current production dataset
  const imgs = {
    q2Main: 'https://cdn.sanity.io/images/quljge22/production/8d66737958efe78d320df796a5263e02367cd7ad-1280x720.png',
    q2Ans : 'https://cdn.sanity.io/images/quljge22/production/23377b1365ee276576f96e86c45df8dff80e8dcc-1280x720.png',
    q1Main: 'https://cdn.sanity.io/images/quljge22/production/827f7d59a03b21a35df6e0e35e45ef00fc0097bf-1280x720.png',
    q1Ans : 'https://cdn.sanity.io/images/quljge22/production/dfcae5e45a80ce0e57c69de1d1392e4a17526814-1280x720.png'
  }

  const [q2Main,q2Ans,q1Main,q1Ans] = await Promise.all([
    uploadImageFromUrl(imgs.q2Main,'q2-main.png'),
    uploadImageFromUrl(imgs.q2Ans ,'q2-ans.png'),
    uploadImageFromUrl(imgs.q1Main,'q1-main.png'),
    uploadImageFromUrl(imgs.q1Ans ,'q1-ans.png'),
  ])

  const docs = [
    {
      _id: 'matchstick-quiz-2',
      _type: 'quiz',
      title: '【マッチ棒クイズ】1本だけ動かして正しい式に：8＋2＝6？',
      slug: { _type: 'slug', current: 'matchstick-quiz-8-plus-2-equals-6' },
      category: { _type: 'reference', _ref: matchId },
      mainImage: q2Main,
      answerImage: q2Ans,
      problemDescription: pt('マッチ棒1本だけを別の場所へ移動して、式「8＋2＝6」を正しい等式に直してください。画像の中で“どの1本を動かすか”がポイントです。'),
      hints: [],
      adCode1: '',
      answerExplanation: pt('左の「8」から右上の縦1本を抜き、右の「6」の右上に移します。左は 8→6、右は 6→8。よって式は 6＋2＝8 となり、正解です。'),
      adCode2: '',
      closingMessage: []
    },
    {
      _id: 'matchstick-quiz-1',
      _type: 'quiz',
      title: '【マッチ棒クイズ】1本だけ動かして正しい式に：9＋1＝8？',
      slug: { _type: 'slug', current: 'matchstick-quiz-9-plus-1-equals-8' },
      category: { _type: 'reference', _ref: matchId },
      mainImage: q1Main,
      answerImage: q1Ans,
      problemDescription: pt('マッチ棒1本だけを別の場所へ移動して、式「9＋1＝8」を正しい等式に直してください。画像の中で“どの1本を動かすか”がポイントです。'),
      hints: [],
      adCode1: '',
      answerExplanation: pt('右の「8」から左下の縦1本を抜き、それを左の「9」の左下に移します。よって式は 8＋1＝9 となり、正解です。'),
      adCode2: '',
      closingMessage: []
    }
  ]

  // upsert docs
  const tx = client.transaction()
  for (const d of docs) tx.createOrReplace(d)
  await tx.commit()
  console.log(JSON.stringify({ ok: true, dataset, seeded: docs.map(d=>d.slug.current) }, null, 2))
}

seed().catch(e=>{ console.error(e); process.exit(1) })

