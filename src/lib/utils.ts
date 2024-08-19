import jsyaml from 'js-yaml'
import * as path from 'path'
import ora from 'ora'

import type { LocalFile, RemoteAgent, RemoteItem } from './types'

export function sprintf(format: string, ...args: any[]): string {
  let i = 0
  return format.replace(/%[sdif]/g, match => {
    switch (match) {
      case '%s':
        return String(args[i++])
      case '%d':
      case '%i':
        return parseInt(args[i++], 10).toString()
      case '%f':
        return parseFloat(args[i++]).toString()
      default:
        return match
    }
  })
}

const metaFields: Array<keyof RemoteAgent> = [
  'lastUpdated',
  'id',
  'createdAt',
  'organisationId',
]

export const toFileObject = (agent: RemoteItem) => {
  let lAgent: Omit<LocalFile, 'filePath'> = {}
  Object.keys(agent).map(key => {
    const val = agent[key as keyof typeof agent]
    if (val && !metaFields.includes(key as keyof RemoteAgent)) {
      ;(lAgent as any)[key] = val
    }
  })

  return lAgent
}

export function isValidPathFormat(filePath: string) {
  // This will normalize the path, resolving '..' and '.' segments
  const normalizedPath = path.normalize(filePath)

  // Check if the path is absolute or relative
  return (
    path.isAbsolute(normalizedPath) ||
    path.isAbsolute(path.join(process.cwd(), normalizedPath))
  )
}

export const getServicePath = (base: string, kind: 'functions' | 'integrals') =>
  path.resolve(base, kind)

export const yamlToJson = (content: string) => {
  try {
    const obj = jsyaml.load(content)
    return JSON.stringify(obj, null, 2)
  } catch (error) {
    ora().fail('Could not convert json to yaml')
    return null
  }
}

export const jsonToYaml = (content: string) => {
  try {
    const obj = JSON.parse(content)
    return jsyaml.dump(obj)
  } catch (error) {
    ora().fail('Could not convert yaml')
    return null
  }
}

export const yamlToObj = <T extends {}>(content: string) => {
  try {
    const obj = jsyaml.load(content)
    return obj as T
  } catch (error) {
    ora().fail('Could not convert yaml')
    return null
  }
}

export const terms = {
  integral: 'integral',
  integrals: 'integrals',
  Integral: 'Integral',
  Integrals: 'Integrals',
  integral_cmd: 'integrals',
  cmd: 'reasonai',
  function_cmd: 'functions',
  functions: 'functions',
  Function: 'Function',
  Functions: 'Functions',
}
