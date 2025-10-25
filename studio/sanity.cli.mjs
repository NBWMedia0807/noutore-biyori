// studio/sanity.cli.mjs
import { defineCliConfig } from 'sanity/cli'
import { SANITY_DEFAULTS } from '../src/lib/sanityDefaults.js'

// Hardcode values for non-interactive deploys
export default defineCliConfig({
  api: {
    projectId: 'quljge22',          // ← あなたの Sanity プロジェクト ID
    dataset: SANITY_DEFAULTS.dataset || 'production' // デフォルトは production
  },
  studioHost: 'noutore-biyori-studio-main'
})
