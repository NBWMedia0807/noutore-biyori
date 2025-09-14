#!/usr/bin/env node
import { createClient } from '@sanity/client'

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 96)
}

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'
const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01'
const token = process.env.SANITY_WRITE_TOKEN

if (!projectId || !dataset || !token) {
  console.error('Missing SANITY_ envs. Need SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN')
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false })
const APPLY = process.argv.includes('--apply')

async function main() {
  const summary = { fixedCategorySlugs: 0, createdCategories: 0, categoryRefs: 0, fixedQuizSlugs: 0, deletedDupQuizzes: 0 }

  // 1) Load categories
  const categories = await client.fetch(`*[_type=="category"]{ _id, title, slug }`)
  const bySlug = new Map()
  const byTitle = new Map()
  for (const c of categories) {
    const cur = c?.slug?.current
    if (cur) bySlug.set(cur, c)
    if (c?.title) byTitle.set(c.title, c)
  }

  // 1-a) ensure slug present
  for (const c of categories) {
    if (!c?.slug?.current && c?.title) {
      const s = slugify(c.title)
      const patch = { slug: { _type: 'slug', current: s } }
      if (APPLY) await client.patch(c._id).set(patch).commit()
      summary.fixedCategorySlugs++
      bySlug.set(s, { ...c, slug: { current: s } })
      byTitle.set(c.title, { ...c, slug: { current: s } })
    }
  }

  // 2) Load quizzes
  const quizzes = await client.fetch(`*[_type=="quiz"]{ _id, _updatedAt, title, "slug": slug.current, category }`)

  // 2-a) fix missing quiz slug
  for (const q of quizzes) {
    if (!q.slug && q.title) {
      const s = slugify(q.title)
      const patch = { slug: { _type: 'slug', current: s } }
      if (APPLY) await client.patch(q._id).set(patch).commit()
      summary.fixedQuizSlugs++
      q.slug = s
    }
  }

  // 2-b) remove duplicate slugs (keep latest _updatedAt)
  const groups = new Map()
  for (const q of quizzes) {
    if (!q.slug) continue
    if (!groups.has(q.slug)) groups.set(q.slug, [])
    groups.get(q.slug).push(q)
  }
  for (const [slug, list] of groups) {
    if (list.length <= 1) continue
    list.sort((a, b) => (a._updatedAt < b._updatedAt ? 1 : -1))
    const keep = list[0]
    const toDelete = list.slice(1)
    for (const d of toDelete) {
      if (APPLY) await client.delete(d._id)
      summary.deletedDupQuizzes++
    }
  }

  // 2-c) normalize category reference
  for (const q of quizzes) {
    const cat = q.category
    let wantCategoryId = null
    if (!cat) continue
    if (cat?._ref) continue // already ref
    // if string: match title or slug
    if (typeof cat === 'string') {
      let slug = slugify(cat)
      let c = bySlug.get(slug) || byTitle.get(cat)
      if (!c) {
        // create category
        const doc = { _type: 'category', title: cat, slug: { _type: 'slug', current: slug } }
        if (APPLY) {
          const created = await client.create(doc)
          c = created
        } else {
          c = { _id: `drafts.${slug}` }
        }
        summary.createdCategories++
        bySlug.set(slug, c)
        byTitle.set(cat, c)
      }
      wantCategoryId = c._id
    } else if (cat?.slug?.current) {
      const c = bySlug.get(cat.slug.current)
      if (c) wantCategoryId = c._id
    }
    if (wantCategoryId) {
      const patch = { category: { _type: 'reference', _ref: wantCategoryId } }
      if (APPLY) await client.patch(q._id).set(patch).commit()
      summary.categoryRefs++
    }
  }

  console.log(JSON.stringify({ apply: APPLY, dataset, summary }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

