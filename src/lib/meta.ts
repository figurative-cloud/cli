import * as fs from 'fs'
import * as path from 'path'

import type { Config, Metadata } from './types'
import { loadConfig } from './config'

const defaultMeta: Metadata = { integrals: [], functions: [] }

const getMetaPath = (config: Config) =>
  path.resolve(config.baseDir, config.metaDataFile)

export const loadMetadata = (): Metadata => {
  const config = loadConfig()
  if (!config) {
    console.error('Cannot load config')
    process.exit()
  }
  const metaPath = getMetaPath(config)
  try {
    if (!fs.existsSync(metaPath)) {
      return { integrals: [], functions: [] }
    }
    const meta: Metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    if (!meta.functions) {
      meta.functions = []
    }
    if (!meta.integrals) {
      meta.integrals = []
    }
    return meta
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

export const saveMetadata = (metadata: Metadata): void => {
  const config = loadConfig()
  if (config)
    fs.writeFileSync(getMetaPath(config), JSON.stringify(metadata, null, 2))
}

export const initMeta = () => {
  const config = loadConfig()
  if (config)
    fs.writeFileSync(getMetaPath(config), JSON.stringify(defaultMeta, null, 2))
}

export const cleanupMeta = (path: string) => {
  fs.rmSync(path, { force: true })
}
