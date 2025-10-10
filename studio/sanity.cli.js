import {defineCliConfig} from 'sanity/cli'
import { SANITY_DEFAULTS } from '../src/lib/sanityDefaults.js'

// Hardcode values for non-interactive deploys
export default defineCliConfig({
  api: {
    projectId: SANITY_DEFAULTS.projectId,
    dataset: SANITY_DEFAULTS.dataset
  },
  studioHost: 'noutore-biyori-studio-main'
})
