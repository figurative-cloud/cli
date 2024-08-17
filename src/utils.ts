import jsyaml from 'js-yaml'
import { LocalAgent, LocalFile, RemoteAgent, RemoteItem } from './lib/types'
import * as path from 'path'
import * as readline from 'readline'
import ora from 'ora'

function sprintf(format: string, ...args: any[]): string {
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

const toFileObject = (agent: RemoteItem) => {
  let lAgent: Omit<LocalFile, 'filePath'> = {}
  Object.keys(agent).map(key => {
    const val = agent[key as keyof typeof agent]
    if (val && !metaFields.includes(key as keyof RemoteAgent)) {
      ; (lAgent as any)[key] = val
    }
  })

  return lAgent
}

const gray = '\x1b[90m'
const reset = '\x1b[0m'

const readLineAsync = (
  message: string,
  defaultValue: string = ''
): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const _defValue = `${gray}${defaultValue}${reset}`

  return new Promise<string>(resolve => {
    const question = `${message}: `

    // Display the question with the default value
    rl.question(question, answer => {
      rl.close()
      const userInput = answer.toString().split(_defValue)?.[1]?.trim()
      resolve(userInput === '' ? defaultValue : userInput)
    })

    rl.write(_defValue)

    // Track if the default value is displayed
    let isDefaultValueDisplayed = true

    // Listen for keypress events to clear the default value
    process.stdin.on('keypress', (char, key) => {
      if (isDefaultValueDisplayed) {
        // Clear the current line
        readline.cursorTo(process.stdout, question.length)
        readline.clearLine(process.stdout, 1)
        isDefaultValueDisplayed = false

        // Write the current key pressed by the user
        process.stdout.write(char)
      }
    })
  })
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

export const getServicePath = (base: string, kind: 'functions' | 'api') =>
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

export { sprintf, toFileObject, readLineAsync }
