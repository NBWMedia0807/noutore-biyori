import {useEffect, useMemo, useState} from 'react'
import {Card, Stack, Text} from '@sanity/ui'
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
    <Stack space={3}>
      {legacyLabel && (
        <Card tone="caution" padding={3} radius={2} shadow={1}>
          <Text size={1}>
            旧フィールドの値「{legacyLabel}」が見つかりました。新しいカテゴリを選択してください。
          </Text>
        </Card>
      )}
      {renderDefault(props)}
    </Stack>
  )
}
