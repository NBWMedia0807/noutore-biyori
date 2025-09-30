import {createRequire} from 'module'
import { SANITY_DEFAULTS } from '../src/lib/sanityDefaults.js'

const { defineCliConfig } = createRequire(import.meta.url)('sanity/cli')

// Hardcode values for non-interactive deploys
export default defineCliConfig({
  api: {
    projectId: SANITY_DEFAULTS.projectId,
    dataset: SANITY_DEFAULTS.dataset
  },
  studioHost: 'noutore-biyori-studio-main'
})
