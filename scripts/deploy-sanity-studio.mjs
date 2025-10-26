#!/usr/bin/env node
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const REQUIRED_PROJECT_ID = 'quljge22'
const REQUIRED_DATASET = 'production'
const REQUIRED_HOST = 'noutore-biyori-studio-main'
const TOKEN_PRIORITY = [
  'SANITY_AUTH_TOKEN',
  'SANITY_DEPLOY_TOKEN',
  'SANITY_API_TOKEN',
  'SANITY_WRITE_TOKEN'
]

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '..')
const studioDir = path.join(repoRoot, 'studio')

async function loadModule(relativePath) {
  const modulePath = path.join(studioDir, relativePath)
  const imported = await import(pathToFileURL(modulePath))
  const config = imported?.default ?? imported
  if (!config || typeof config !== 'object') {
    throw new Error(`${relativePath} から有効な設定を読み込めませんでした。`)
  }
  return config
}

async function loadStudioConfig() {
  return loadModule('sanity.config.js')
}

async function loadCliConfig() {
  return loadModule('sanity.cli.mjs')
}

function ensureValue(label, actual, expected) {
  if (!actual) {
    throw new Error(`${label} が未設定です。設定ファイルを確認してください。`)
  }
  if (expected && actual !== expected) {
    throw new Error(`${label} が想定値 (${expected}) と一致しません。現在の値: ${actual}`)
  }
  return actual
}

function pickToken(env) {
  for (const key of TOKEN_PRIORITY) {
    const value = env[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return {key, value: value.trim()}
    }
  }
  return null
}

function requireToken(env) {
  const token = pickToken(env)
  if (!token) {
    const printableKeys = TOKEN_PRIORITY.join(', ')
    throw new Error(`認証用トークンが見つかりません。以下のいずれかを設定してください: ${printableKeys}`)
  }
  return token
}

function runSanityCommand(args, token) {
  const result = spawnSync('pnpm', ['exec', 'sanity', ...args], {
    cwd: studioDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      SANITY_AUTH_TOKEN: token.value,
      SANITY_DEPLOY_TOKEN: token.value,
      SANITY_API_TOKEN: token.value,
      SANITY_WRITE_TOKEN: token.value
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
  const token = requireToken(process.env)
  const [config, cliConfig] = await Promise.all([loadStudioConfig(), loadCliConfig()])

  const workspaceName = ensureValue('workspace 名', config.name || 'default')
  const projectId = ensureValue('projectId', config.projectId, REQUIRED_PROJECT_ID)
  const dataset = ensureValue('dataset', config.dataset, REQUIRED_DATASET)
  const studioHost = ensureValue('studioHost', config.studioHost, REQUIRED_HOST)
  const cliProjectId = ensureValue('CLI projectId', cliConfig?.api?.projectId, REQUIRED_PROJECT_ID)
  const cliDataset = ensureValue('CLI dataset', cliConfig?.api?.dataset, REQUIRED_DATASET)
  const cliHost = ensureValue('CLI studioHost', cliConfig?.studioHost, REQUIRED_HOST)

  if (projectId !== cliProjectId || dataset !== cliDataset || studioHost !== cliHost) {
    throw new Error('sanity.config.js と sanity.cli.mjs の設定が一致しません。両ファイルを確認してください。')
  }

  console.log('--- Sanity Studio deploy configuration ---')
  console.log(`workspace : ${workspaceName}`)
  console.log(`projectId : ${projectId}`)
  console.log(`dataset   : ${dataset}`)
  console.log(`studioHost: ${studioHost}`)
  console.log(`token     : ${token.key}`)
  console.log('-----------------------------------------')

  runSanityCommand(['schema', 'deploy', '--workspace', workspaceName], token)
  runSanityCommand(['deploy', '--no-open', '--yes'], token)

  console.log(`Sanity Studio を https://${studioHost}.sanity.studio/ へデプロイしました。`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
