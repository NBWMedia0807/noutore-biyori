import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'

import {deskStructure} from './structure/index.js'
import {schemaTypes} from './schemas'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'quljge22'
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'

export default defineConfig({
  name: 'default',
  title: '脳トレ日和 Studio',
  projectId,
  dataset,
  apiVersion: '2024-08-01',
  useCdn: false,
  plugins: [
    deskTool({
      structure: (S) => deskStructure(S)
    })
  ],
  schema: {
    types: schemaTypes
  }
})
