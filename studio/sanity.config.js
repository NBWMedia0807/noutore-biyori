// studio/sanity.config.js
import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemaTypes'

export default defineConfig({
  name: 'noutore-biyori-studio',
  title: 'noutore-biyori',
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  plugins: [deskTool(), visionTool()],
  schema: { types: schemaTypes }
})
