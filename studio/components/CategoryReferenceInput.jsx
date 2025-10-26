import {useEffect, useMemo, useState} from 'react'
import {unset} from 'sanity'

const describeLegacyValue = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return ''
  if (value.title) return value.title
  if (value.name) return value.name
  if (value.slug) {
    if (typeof value.slug === 'string') return value.slug
    if (typeof value.slug?.current === 'string') return value.slug.current
  }
  return ''
}

const normalizeValue = (value) => {
  if (!value) return null
  if (typeof value === 'object' && value?._ref) return value
  return null
}

export default function CategoryReferenceInput(props) {
  const {value, renderDefault, onChange} = props
  const [legacyLabel, setLegacyLabel] = useState('')
  const hasReference = useMemo(() => Boolean(normalizeValue(value)), [value])

  useEffect(() => {
    if (!value) return
    if (typeof value === 'object' && value?._ref) return

    const label = describeLegacyValue(value)
    if (label && !legacyLabel) {
      setLegacyLabel(label)
    }
    onChange?.(unset())
  }, [value, onChange, legacyLabel])

  useEffect(() => {
    if (hasReference && legacyLabel) {
      setLegacyLabel('')
    }
  }, [hasReference, legacyLabel])

  return (
    <div style={{display: 'grid', gap: '0.75rem'}}>
      {legacyLabel && (
        <div
          style={{
            borderRadius: '0.5rem',
            border: '1px solid #f9aa33',
            backgroundColor: '#fff7e6',
            padding: '0.75rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
          }}
        >
          <p style={{margin: 0, fontSize: '0.875rem', lineHeight: 1.5}}>
            旧フィールドの値「{legacyLabel}」が見つかりました。新しいカテゴリを選択してください。
          </p>
        </div>
      )}
      {renderDefault(props)}
    </div>
  )
}
