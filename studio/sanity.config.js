import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'

import deskStructure from './deskStructure.js'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: '脳トレ日和 Studio',
  projectId: 'quljge22',
  dataset: 'production',
  useCdn: false,
  plugins: [deskTool({structure: (S) => deskStructure(S)}), visionTool()],
  schema: {
    types: schemaTypes
  }
})
