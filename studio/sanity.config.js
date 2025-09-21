// studio/sanity.config.js
import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemas/index.js'

export default defineConfig({
  name: 'noutore-biyori-studio',
  title: 'noutore-biyori',
  // Hardcode to avoid env dependency during hosted deploys
  projectId: 'quljge22',
  dataset: 'production',
  studioHost: 'noutore-biyori-studio-main',
  plugins: [deskTool(), visionTool()],
  schema: { types: schemaTypes }
})
