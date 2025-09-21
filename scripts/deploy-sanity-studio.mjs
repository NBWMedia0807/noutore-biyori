#!/usr/bin/env node
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const REQUIRED_PROJECT_ID = 'quljge22'
const REQUIRED_DATASET = 'production'
const REQUIRED_HOST = 'noutore-biyori-studio-main'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '..')
const studioDir = path.join(repoRoot, 'studio')

async function loadStudioConfig() {
  const configModule = await import(pathToFileURL(path.join(studioDir, 'sanity.config.js')))
  const config = configModule?.default ?? configModule
  if (!config || typeof config !== 'object') {
    throw new Error('sanity.config.js から有効な設定を読み込めませんでした。')
  }
  return config
}

function ensureValue(label, actual, expected) {
  if (!actual) {
    throw new Error(`${label} が未設定です。sanity.config.js を確認してください。`)
  }
  if (expected && actual !== expected) {
    throw new Error(`${label} が想定値 (${expected}) と一致しません。現在の値: ${actual}`)
  }
  return actual
}

function runSanityCommand(args, env) {
  const result = spawnSync('pnpm', ['exec', 'sanity', ...args], {
    cwd: studioDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      SANITY_AUTH_TOKEN: env.SANITY_AUTH_TOKEN,
      SANITY_DEPLOY_TOKEN: env.SANITY_AUTH_TOKEN
    }
  })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`sanity ${args.join(' ')} が終了コード ${result.status} で失敗しました。`)
  }
}

async function main() {
  const token = process.env.SANITY_AUTH_TOKEN || process.env.SANITY_DEPLOY_TOKEN

  if (!token) {
    throw new Error('SANITY_AUTH_TOKEN が設定されていません。GitHub Secrets を確認してください。')
  }

  const config = await loadStudioConfig()
  const workspaceName = ensureValue('workspace 名', config.name || 'default')
  const projectId = ensureValue('projectId', config.projectId, REQUIRED_PROJECT_ID)
  const dataset = ensureValue('dataset', config.dataset, REQUIRED_DATASET)
  const studioHost = ensureValue('studioHost', config.studioHost, REQUIRED_HOST)

  console.log('--- Sanity Studio deploy configuration ---')
  console.log(`workspace : ${workspaceName}`)
  console.log(`projectId : ${projectId}`)
  console.log(`dataset   : ${dataset}`)
  console.log(`studioHost: ${studioHost}`)
  console.log('-----------------------------------------')

  runSanityCommand(['schema', 'deploy', '--workspace', workspaceName], {SANITY_AUTH_TOKEN: token})
  runSanityCommand(['deploy', '--no-open', '--yes', '--schema-required'], {SANITY_AUTH_TOKEN: token})

  console.log(`Sanity Studio を https://${studioHost}.sanity.studio/ へデプロイしました。`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
