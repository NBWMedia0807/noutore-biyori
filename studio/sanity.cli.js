// studio/sanity.cli.js
// CommonJS fallback version for Sanity v3.99 CLI
const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'quljge22'
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'

module.exports = {
  api: {
    projectId,       // ← Sanity Project ID
    dataset          // ← Default dataset
  },
  studioHost: 'noutore-biyori-studio-main'
}
