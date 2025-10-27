import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import deskStructure from './deskStructure.js'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: '脳トレ日和 Studio',
  projectId: 'quljge22',
  dataset: 'production',
  useCdn: false,
  plugins: [structureTool({structure: deskStructure}), visionTool()],
  schema: {
    types: schemaTypes
  }
})
