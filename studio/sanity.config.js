// studio/sanity.config.js
const {defineConfig, ScheduleAction, ScheduledBadge} = require('sanity')
const {deskTool} = require('sanity/desk')
const {visionTool} = require('@sanity/vision')
const schemaTypes = require('./schemas')
const { SANITY_DEFAULTS } = require('../src/lib/sanityDefaults.js')

module.exports = defineConfig({
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
        return previous
      }
      return previous.filter((badge) => badge !== ScheduledBadge)
    }
  },
  plugins: [deskTool(), visionTool()],
  schema: { types: schemaTypes }
})
