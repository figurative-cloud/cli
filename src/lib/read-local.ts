import fs from 'fs/promises'
import * as f from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { LocalFile } from './types'

async function walkDir(dir: string): Promise<string[]> {
  let results: string[] = []
  const list = await fs.readdir(dir, { withFileTypes: true })

  for (const file of list) {
    const fullPath = path.join(dir, file.name)
    if (file.isDirectory()) {
      const nestedResults = await walkDir(fullPath)
      results = results.concat(nestedResults)
    } else if (file.isFile() && path.extname(file.name) === '.json') {
      results.push(fullPath)
    }
  }

  return results
}

async function readJsonFiles<T extends LocalFile>(dir: string): Promise<T[]> {
  if (!f.existsSync(dir)) {
    return []
  }

  try {
    const dirs = await walkDir(dir)
    const objects = await Promise.all(
      dirs.map(async file => {
        const data = await fs.readFile(file, 'utf8')
        const content = JSON.parse(data)
        return { filePath: file, ...content }
      })
    )
    return objects
  } catch (error) {
    console.error('Error reading JSON files', error)
    throw error
  }
}

async function findAllFolders(dir: string) {
  const folders: string[] = []
  if (!f.existsSync(dir)) {
    return folders
  }

  async function walk(currentDir: string) {
    const files = await fs.readdir(currentDir, { withFileTypes: true })
    for (const file of files) {
      if (file.isDirectory()) {
        const folderPath = path.join(currentDir, file.name)
        folders.push(folderPath)
        // await walk(folderPath) // Recursively walk through subdirectories
      }
    }
  }
  await walk(dir)
  return folders
}

async function readFileContent(filePath: string) {
  const ext = path.extname(filePath)
  const fileContent = await fs.readFile(filePath, 'utf8')
  if (ext === '.json') {
    return JSON.parse(fileContent)
  } else if (ext === '.yaml' || ext === '.yml') {
    return yaml.load(fileContent)
  } else {
    throw new Error(`Unsupported file type: ${ext}`)
  }
}

export async function findFilesInFolders(baseDir: string) {
  const folders = await findAllFolders(baseDir)
  const results = []

  for (const folder of folders) {
    const folderName = path.basename(folder)
    const jsonFilePath = path.join(folder, `${folderName}.json`)
    const yamlFilePath = path.join(folder, `${folderName}.yaml`)
    const ymlFilePath = path.join(folder, `${folderName}.yml`)

    try {
      if (f.existsSync(jsonFilePath)) {
        const content = await readFileContent(jsonFilePath)
        results.push({ filePath: folder, ...content })
      } else if (f.existsSync(yamlFilePath)) {
        const content = await readFileContent(yamlFilePath)
        results.push({ filePath: folder, ...content })
      } else if (f.existsSync(ymlFilePath)) {
        const content = await readFileContent(ymlFilePath)
        results.push({ filePath: folder, ...content })
      }
    } catch (error) {
      console.error(`Error reading file in folder ${folder}:`, error)
    }
  }

  return results
}
