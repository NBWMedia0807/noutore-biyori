// studio/sanity.config.js
import {defineConfig, ScheduleAction, ScheduledBadge} from 'sanity'
import {deskTool} from 'sanity/desk'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemas'
import { SANITY_DEFAULTS } from '../src/lib/sanityDefaults.js'
import { createQuizPublishBadge } from './utils/quizPublishBadge.js'

export default defineConfig({
  name: 'noutore-biyori-studio',
  title: 'noutore-biyori',
  // Hardcode to avoid env dependency during hosted deploys
  projectId: SANITY_DEFAULTS.projectId,
  dataset: SANITY_DEFAULTS.dataset,
  studioHost: 'noutore-biyori-studio-main',
  scheduledPublishing: { enabled: true, defaultScheduleTimeZone: 'Asia/Tokyo' },
  document: {
    actions: (previous, context) => {
      if (context.schemaType === 'quiz') {
        return previous
      }
      return previous.filter((action) => {
        if (action === ScheduleAction) return false
        return action?.action !== ScheduleAction.action
      })
    },
    badges: (previous, context) => {
      if (context.schemaType === 'quiz') {
        const doc = context?.document || context?.draft || context?.published || null
        const badge = createQuizPublishBadge(doc)
        return badge ? [...previous, () => badge] : previous
      }
      return previous.filter((badge) => badge !== ScheduledBadge)
    }
  },
  plugins: [deskTool(), visionTool()],
  schema: { types: schemaTypes }
})
