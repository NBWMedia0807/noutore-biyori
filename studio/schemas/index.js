// studio/schemas/index.js
const quiz = require('./quiz.js')
const category = require('./category.js')

const schemaTypes = [quiz, category]

// Sanity Studio で使うスキーマをまとめて CommonJS で export
module.exports = schemaTypes
