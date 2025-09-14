import {defineCliConfig} from 'sanity/cli'

// Hardcode values for non-interactive deploys
export default defineCliConfig({
  api: {
    projectId: 'quljge22',
    dataset: 'production'
  }
})
