import * as fs from 'fs'
import * as path from 'path'
import jsYaml from 'js-yaml'

import type { Config } from './types'

const defaultConfig: Partial<Config> = {
  baseDir: './reason',
  metaDataFile: '.meta.json',
  configFormat: 'json',
}

// TODO: merge
const CONFIG_FILE = './reason/config.json'
const CONFIG_FILE_YML = './reason/config.yaml'
const getConfigPath = (config: Config) =>
  path.resolve(config.baseDir, `config.${config.configFormat}`)

export const initConfig = (config: Partial<Config>) => {
  const d = { ...defaultConfig, ...config } as Config
  // const configP = getConfigPath(d as Config)

  if (!fs.existsSync(d.baseDir)) {
    fs.mkdirSync(d.baseDir)
  }

  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE)
  }
  if (fs.existsSync(CONFIG_FILE_YML)) {
    fs.unlinkSync(CONFIG_FILE_YML)
  }

  saveConfig(d)

  return loadConfig()
}

export const loadConfig = (): Config | null => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }

    if (fs.existsSync(CONFIG_FILE_YML)) {
      return jsYaml.load(fs.readFileSync(CONFIG_FILE_YML, 'utf-8')) as Config
    }

    return null
  } catch (error) {
    console.error('Could not load config')
    return null
  }
}

export const saveConfig = (config: Config) => {
  console.log(config)
  const p = getConfigPath(config)
  let content = ''
  if (config.configFormat === 'json') {
    content = JSON.stringify(config, null, 2)
  } else if (config.configFormat === 'yaml') {
    content = jsYaml.dump(config, { indent: 2 })
  }
  fs.writeFileSync(p, content)
}

export const deleteConfig = () => {
  const config = loadConfig()
  if (config) {
    const p = getConfigPath(config)

    if (fs.existsSync(p)) {
      fs.unlinkSync(p)
    }
  }
}
