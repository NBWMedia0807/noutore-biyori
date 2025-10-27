// studio/utils/toPlainText.js

const isCallableToString = (value) =>
  typeof value?.toString === 'function' && value.toString !== Object.prototype.toString

const extractBlockText = (block) => {
  if (!block || typeof block !== 'object') return ''
  if (typeof block.text === 'string') return block.text
  if (Array.isArray(block.children)) {
    return block.children
      .map((child) => (typeof child?.text === 'string' ? child.text : ''))
      .join('')
  }
  return ''
}

export const toPlainText = (value) => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!value) return ''

  if (Array.isArray(value)) {
    return value
      .map((item) => toPlainText(item))
      .filter(Boolean)
      .join(' ')
      .trim()
  }

  if (typeof value === 'object') {
    if (typeof value.current === 'string') return value.current.trim()
    if (typeof value.title === 'string') return value.title.trim()
    if (typeof value.name === 'string') return value.name.trim()
    if (typeof value.value === 'string') return value.value.trim()
    if (value._type === 'block') return extractBlockText(value).trim()
    if (typeof value.text === 'string') return value.text.trim()
    if (isCallableToString(value)) {
      const stringified = value.toString()
      if (typeof stringified === 'string' && stringified !== '[object Object]') {
        return stringified.trim()
      }
    }
  }

  return ''
}

export default toPlainText
