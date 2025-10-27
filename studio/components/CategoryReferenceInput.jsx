import {useEffect, useRef} from 'react'
import {set, unset, useClient} from 'sanity'

const isStrongReference = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      value._type === 'reference' &&
      typeof value._ref === 'string' &&
      !value._weak
  )

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 96)

const collectCandidateStrings = (value) => {
  if (!value) return []

  const candidates = new Set()

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) {
      candidates.add(trimmed)
      candidates.add(trimmed.toLowerCase())
    }
  }

  if (typeof value === 'object') {
    const title = typeof value.title === 'string' ? value.title.trim() : ''
    if (title) {
      candidates.add(title)
      candidates.add(title.toLowerCase())
    }

    const slug =
      typeof value.slug === 'string'
        ? value.slug.trim()
        : typeof value?.slug?.current === 'string'
          ? value.slug.current.trim()
          : typeof value.current === 'string'
            ? value.current.trim()
            : ''

    if (slug) {
      candidates.add(slug)
      candidates.add(slug.toLowerCase())
    }

    const name = typeof value.name === 'string' ? value.name.trim() : ''
    if (name) {
      candidates.add(name)
      candidates.add(name.toLowerCase())
    }
  }

  const normalized = new Set()
  for (const candidate of candidates) {
    if (!candidate) continue
    normalized.add(candidate)
    normalized.add(slugify(candidate))
  }

  return Array.from(normalized).filter(Boolean)
}

const resolveCategoryId = async (client, cache, pending, rawValue) => {
  const keyBase = String(rawValue || '').trim()
  if (!keyBase) return null

  const slugCandidate = slugify(keyBase)
  const cacheKeys = Array.from(new Set([`title:${keyBase.toLowerCase()}`, `slug:${keyBase.toLowerCase()}`, `slug:${slugCandidate}`]))

  for (const key of cacheKeys) {
    if (cache.has(key)) {
      return cache.get(key)
    }
  }

  for (const key of cacheKeys) {
    if (pending.has(key)) {
      return pending.get(key)
    }
  }

  const queryValues = Array.from(
    new Set(
      [keyBase, keyBase.toLowerCase(), slugCandidate].filter(Boolean)
    )
  )

  if (queryValues.length === 0) {
    for (const key of cacheKeys) {
      cache.set(key, null)
    }
    return null
  }

  const fetchPromise = client
    .fetch(
      '*[_type == "category" && !(_id in path("drafts.**")) && (title in $values || slug.current in $values)][0]{_id}',
      {values: queryValues}
    )
    .then((doc) => doc?._id ?? null)
    .catch(() => null)

  for (const key of cacheKeys) {
    pending.set(key, fetchPromise)
  }

  const result = await fetchPromise

  for (const key of cacheKeys) {
    pending.delete(key)
    cache.set(key, result)
  }

  return result
}

const sanitizeCategoryValue = async (value, client, cache, pending) => {
  if (value === undefined || value === null) {
    return {type: 'noop'}
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = await sanitizeCategoryValue(item, client, cache, pending)
      if (result.type === 'set') return result
      if (result.type === 'noop') return result
    }
    return {type: 'unset'}
  }

  if (isStrongReference(value)) {
    return {type: 'noop'}
  }

  if (value && typeof value === 'object') {
    if (typeof value._id === 'string') {
      return {type: 'set', value: {_type: 'reference', _ref: value._id}}
    }

    if (typeof value._ref === 'string') {
      return {type: 'set', value: {_type: 'reference', _ref: value._ref}}
    }
  }

  if (typeof value === 'string' || typeof value === 'object') {
    const candidates = collectCandidateStrings(value)
    for (const candidate of candidates) {
      const refId = await resolveCategoryId(client, cache, pending, candidate)
      if (refId) {
        return {type: 'set', value: {_type: 'reference', _ref: refId}}
      }
    }

    return {type: 'unset'}
  }

  return {type: 'noop'}
}

const isSameReferenceValue = (currentValue, nextValue) =>
  Boolean(
    currentValue &&
      typeof currentValue === 'object' &&
      currentValue._type === 'reference' &&
      typeof currentValue._ref === 'string' &&
      currentValue._ref === nextValue._ref &&
      !currentValue._weak
  )

const CategoryReferenceInput = (props) => {
  const {value, onChange} = props
  const client = useClient({apiVersion: '2024-01-01'})
  const cacheRef = useRef(new Map())
  const pendingRef = useRef(new Map())

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const action = await sanitizeCategoryValue(value, client, cacheRef.current, pendingRef.current)
      if (cancelled || !action || action.type === 'noop') return

      if (action.type === 'set') {
        if (isSameReferenceValue(value, action.value)) return
        onChange(set(action.value))
        return
      }

      if (action.type === 'unset') {
        if (value === undefined || value === null) return
        onChange(unset())
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [value, onChange, client])

  return props.renderDefault(props)
}

export default CategoryReferenceInput
