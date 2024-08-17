import * as fs from 'fs'
import * as path from 'path'
import type {
  Config,
  LocalFile,
  Metadata,
  MetaItem,
  RemoteItem,
} from '../lib/types'
import { toFileObject } from '../utils'
import { saveMetadata } from '../lib/meta'
import jsYaml from 'js-yaml'
import { loadConfig } from './config'

export const updateFileContent = (
  config: Config,
  filePath: string,
  content: Omit<LocalFile, 'filePath'>
): void => {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath)
  }

  let _content = ''
  if (config.configFormat === 'json')
    _content = JSON.stringify(content, null, 2)
  else if (config.configFormat === 'yaml') {
    _content = jsYaml.dump(content, { indent: 2 })
  }
  fs.writeFileSync(
    path.resolve(filePath, `${content.name}.${config.configFormat}`),
    _content
  )
}

// file path is a dir
export const removeFile = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { recursive: true, force: true })
  }
}

export const pullItems = (
  dir: string,
  metadata: Metadata,
  remoteItems: RemoteItem[],
  key: keyof Metadata
) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const config = loadConfig()
  if (!config) {
    console.log('cannot load config')
    process.exit()
  }

  const metaItems = metadata[key]

  remoteItems.forEach(rItem => {
    const mItemIndex = metaItems.findIndex(mItem => mItem.id === rItem.id)
    const mItem = mItemIndex >= 0 ? metaItems?.[mItemIndex] : undefined
    const filePath = mItem?.filePath ?? path.resolve(dir, `${rItem.name}`)
    updateFileContent(config, filePath, toFileObject(rItem))

    let items = metaItems
    const updatedItem: MetaItem = { filePath, ...rItem }
    if (mItemIndex >= 0) {
      items[mItemIndex] = updatedItem
    } else {
      items.push(updatedItem)
    }

    saveMetadata({
      ...metadata,
      [key]: items,
    })
  })

  // remove local files that are not in remote
  metaItems.forEach(mItem => {
    if (!remoteItems.find(rItem => rItem.id === mItem.id)) {
      removeFile(mItem.filePath)
      saveMetadata({
        ...metadata,
        [key]: metaItems.filter(a => a.id !== mItem.id),
      })
    }
  })
}
