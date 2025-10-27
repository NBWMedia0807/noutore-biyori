import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'

import deskStructure from './deskStructure.js'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: '脳トレ日和 Studio',
  projectId: 'quljge22',
  dataset: 'production',
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
