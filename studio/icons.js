// studio/icons.js
import React from 'react'

const baseStyle = { fontSize: '1.2em', lineHeight: 1 }

export const CategoryIcon = () =>
  React.createElement('span', {
    role: 'img',
    'aria-label': 'カテゴリ',
    style: baseStyle
  }, '🏷️')

export const QuizIcon = () =>
  React.createElement('span', {
    role: 'img',
    'aria-label': 'クイズ',
    style: baseStyle
  }, '🧠')

export default {
  CategoryIcon,
  QuizIcon
}
