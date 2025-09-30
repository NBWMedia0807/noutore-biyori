// studio/sanity.config.js
import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemas/index.js'
import { SANITY_DEFAULTS } from '../src/lib/sanityDefaults.js'

export default defineConfig({
  name: 'noutore-biyori-studio',
  title: 'noutore-biyori',
  // Hardcode to avoid env dependency during hosted deploys
  projectId: SANITY_DEFAULTS.projectId,
  dataset: SANITY_DEFAULTS.dataset,
  studioHost: 'noutore-biyori-studio-main',
  plugins: [deskTool(), visionTool()],
  schema: { types: schemaTypes }
})
