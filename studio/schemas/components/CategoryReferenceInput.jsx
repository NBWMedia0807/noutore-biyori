import {useEffect, useMemo} from 'react'
import {set, unset} from 'sanity'

function pickFirstValidReference(inputValue) {
  if (!Array.isArray(inputValue)) return undefined

  return inputValue.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      item._type === 'reference' &&
      typeof item._ref === 'string' &&
      item._ref
  )
}

export default function CategoryReferenceInput(props) {
  const {value, onChange, renderDefault} = props

  const normalizedValue = useMemo(() => {
    if (Array.isArray(value)) {
      const ref = pickFirstValidReference(value)
      return ref ?? undefined
    }

    if (value && typeof value === 'object') {
      if (value._type === 'reference' && typeof value._ref === 'string') {
        return value
      }
      return undefined
    }

    return undefined
  }, [value])

  useEffect(() => {
    if (Array.isArray(value)) {
      const ref = pickFirstValidReference(value)
      if (ref) {
        onChange(set(ref))
      } else {
        onChange(unset())
      }
    } else if (value && typeof value === 'object') {
      if (!(value._type === 'reference' && typeof value._ref === 'string')) {
        onChange(unset())
      }
    } else if (value != null) {
      onChange(unset())
    }
  }, [value, onChange])

  return renderDefault({
    ...props,
    value: normalizedValue
  })
}
