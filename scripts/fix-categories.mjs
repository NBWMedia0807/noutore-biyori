#!/usr/bin/env node
import {createClient} from '@sanity/client'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const datasetArg = args.find((value) => value.startsWith('--dataset='))
const projectId = process.env.SANITY_PROJECT_ID
const dataset = datasetArg ? datasetArg.split('=')[1] : process.env.SANITY_DATASET || 'production'
const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01'
const writeToken = process.env.SANITY_WRITE_TOKEN
const readToken = process.env.SANITY_READ_TOKEN || writeToken

if (!projectId) {
  console.error('SANITY_PROJECT_ID が設定されていません。')
  process.exit(1)
}

if (APPLY && !writeToken) {
  console.error('--apply オプションを利用するには SANITY_WRITE_TOKEN が必要です。')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: APPLY ? writeToken : readToken,
  useCdn: false
})

const summary = {
  quizzesChecked: 0,
  alreadyValid: 0,
  normalized: 0,
  cleared: 0,
  createdCategories: 0,
  missingReference: 0,
  skipped: 0
}

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 96)

const registerCategory = (map, doc) => {
  if (!doc?._id) return
  map.byId.set(doc._id, doc)
  const title = typeof doc.title === 'string' ? doc.title.trim() : ''
  const slug = typeof doc.slug === 'string' ? doc.slug : doc?.slug?.current
  if (title) {
    map.byTitle.set(title, doc)
    map.byTitleLower.set(title.toLowerCase(), doc)
  }
  if (slug) {
    map.bySlug.set(slug, doc)
    map.bySlug.set(slugify(slug), doc)
  }
  if (title) {
    map.bySlug.set(slugify(title), doc)
  }
}

const loadCategories = async () => {
  const categories = await client.fetch(
    `*[_type == "category"]{ _id, title, "slug": slug.current }`
  )
  const map = {
    list: categories,
    byId: new Map(),
    bySlug: new Map(),
    byTitle: new Map(),
    byTitleLower: new Map()
  }
  for (const category of categories) {
    registerCategory(map, category)
  }
  return map
}

const ensureCategoryExists = async (map, titleOrSlug) => {
  const trimmed = typeof titleOrSlug === 'string' ? titleOrSlug.trim() : ''
  if (!trimmed) return null

  const slugCandidate = slugify(trimmed)
  const existing =
    map.bySlug.get(trimmed) ||
    map.bySlug.get(slugCandidate) ||
    map.byTitle.get(trimmed) ||
    map.byTitleLower.get(trimmed.toLowerCase())

  if (existing) return existing
  if (!APPLY) return null

  const doc = await client.create({
    _type: 'category',
    title: trimmed,
    slug: { _type: 'slug', current: slugCandidate }
  })
  registerCategory(map, doc)
  summary.createdCategories += 1
  console.log(`カテゴリを新規作成: ${trimmed} (${doc._id})`)
  return doc
}

const normalizeCategoryValue = async (map, value) => {
  if (!value) {
    return { action: 'unset', reason: '値が未設定' }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = await normalizeCategoryValue(map, item)
      if (result.action === 'set') return result
      if (result.action === 'keep') return result
    }
    return { action: 'unset', reason: '配列に有効なカテゴリが存在しない' }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return { action: 'unset', reason: '空文字列' }
    const existing =
      map.byTitle.get(trimmed) ||
      map.byTitleLower.get(trimmed.toLowerCase()) ||
      map.bySlug.get(trimmed) ||
      map.bySlug.get(slugify(trimmed))
    if (existing) {
      return { action: 'set', refId: existing._id, reason: 'タイトルまたはスラッグから参照化' }
    }
    const created = await ensureCategoryExists(map, trimmed)
    if (created) {
      return { action: 'set', refId: created._id, reason: 'カテゴリを自動作成して参照化' }
    }
    return { action: 'unset', reason: '一致するカテゴリが見つからない文字列' }
  }

  if (typeof value === 'object') {
    if (value._type === 'reference' && typeof value._ref === 'string') {
      if (map.byId.has(value._ref)) {
        if (value._weak) {
          return { action: 'set', refId: value._ref, reason: 'weak 属性を除去して強参照化' }
        }
        return { action: 'keep' }
      }
      summary.missingReference += 1
      return { action: 'unset', reason: `存在しないカテゴリ参照: ${value._ref}` }
    }

    if (typeof value._ref === 'string') {
      if (map.byId.has(value._ref)) {
        return { action: 'set', refId: value._ref, reason: '_type が欠落した参照を補正' }
      }
      summary.missingReference += 1
      return { action: 'unset', reason: `存在しないカテゴリ参照: ${value._ref}` }
    }

    if (typeof value._id === 'string' && map.byId.has(value._id)) {
      return { action: 'set', refId: value._id, reason: 'ドキュメント埋め込みから参照へ変換' }
    }

    const currentSlug =
      typeof value?.slug === 'string'
        ? value.slug
        : typeof value?.slug?.current === 'string'
          ? value.slug.current
          : null
    if (currentSlug) {
      const bySlug = map.bySlug.get(currentSlug) || map.bySlug.get(slugify(currentSlug))
      if (bySlug) {
        return { action: 'set', refId: bySlug._id, reason: 'スラッグ情報から参照化' }
      }
      const created = await ensureCategoryExists(map, currentSlug)
      if (created) {
        return { action: 'set', refId: created._id, reason: 'スラッグからカテゴリ新規作成' }
      }
    }

    if (typeof value.title === 'string') {
      const byTitle =
        map.byTitle.get(value.title) ||
        map.byTitleLower.get(value.title.toLowerCase()) ||
        map.bySlug.get(slugify(value.title))
      if (byTitle) {
        return { action: 'set', refId: byTitle._id, reason: 'タイトルから参照化' }
      }
      const created = await ensureCategoryExists(map, value.title)
      if (created) {
        return { action: 'set', refId: created._id, reason: 'タイトルからカテゴリ新規作成' }
      }
    }

    if (typeof value.current === 'string') {
      const byCurrent = map.bySlug.get(value.current) || map.bySlug.get(slugify(value.current))
      if (byCurrent) {
        return { action: 'set', refId: byCurrent._id, reason: 'current フィールドから参照化' }
      }
      const created = await ensureCategoryExists(map, value.current)
      if (created) {
        return { action: 'set', refId: created._id, reason: 'current フィールドからカテゴリ新規作成' }
      }
    }

    return { action: 'unset', reason: `未対応のカテゴリ値: ${JSON.stringify(value)}` }
  }

  return { action: 'unset', reason: `未対応のカテゴリ型: ${typeof value}` }
}

const main = async () => {
  console.log('Sanity カテゴリ参照の正規化を開始します。')
  console.log(`プロジェクト: ${projectId} / データセット: ${dataset}`)
  if (!APPLY) {
    console.log('実行モード: ドライラン（--apply を付けると書き込みます）')
  }

  const categoryMap = await loadCategories()
  console.log(`カテゴリドキュメント数: ${categoryMap.list.length}`)

  const quizzes = await client.fetch(
    `*[_type == "quiz"]{ _id, title, "category": category, "slug": slug.current }`
  )
  console.log(`クイズドキュメント数: ${quizzes.length}`)

  const patches = []

  for (const quiz of quizzes) {
    summary.quizzesChecked += 1
    const result = await normalizeCategoryValue(categoryMap, quiz.category)

    if (result.action === 'keep') {
      summary.alreadyValid += 1
      continue
    }

    if (result.action === 'set' && typeof result.refId === 'string') {
      summary.normalized += 1
      patches.push({
        id: quiz._id,
        set: { category: { _type: 'reference', _ref: result.refId } },
        reason: result.reason
      })
      continue
    }

    if (result.action === 'unset') {
      summary.cleared += 1
      patches.push({ id: quiz._id, unset: ['category'], reason: result.reason })
      continue
    }

    summary.skipped += 1
  }

  if (!patches.length) {
    console.log('修正対象のドキュメントはありませんでした。')
  } else {
    console.log(`修正対象ドキュメント数: ${patches.length}`)
    for (const patch of patches) {
      console.log(`- ${patch.id}: ${patch.reason}`)
      if (APPLY) {
        if (patch.set) {
          await client.patch(patch.id).set(patch.set).commit({ autoGenerateArrayKeys: true })
        } else if (patch.unset) {
          await client.patch(patch.id).unset(patch.unset).commit({ autoGenerateArrayKeys: true })
        }
      }
    }
  }

  console.log('=== Summary ===')
  console.log(JSON.stringify({ APPLY, dataset, summary }, null, 2))
}

main().catch((error) => {
  console.error('カテゴリ修正中にエラーが発生しました。')
  console.error(error)
  process.exit(1)
})

