import * as path from 'path'
import ora from 'ora'

import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { loadMetadata, saveMetadata } from '../lib/meta'
import { findFilesInFolders } from '../lib/read-local'
import { createItem, deleteItem, getList, runApi, updateItem } from '../lib/api'
import { loadConfig } from '../lib/config'
import { RecordStatus, getStatusTable, printStatusTable } from '../lib/status'
import { pullItems, updateFileContent } from '../lib/pull'
import { getServicePath } from '../utils'
import prompts, { PromptObject } from 'prompts'
import { nanoid } from 'nanoid/non-secure'

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)

const params = {
  label: 'agent',
  uri: '/apis',
}

const status = async (): Promise<void> => {
  console.log('Reason API\n')
  let spinner = ora()
  const config = loadConfig()
  if (!config?.auth) {
    spinner.fail('Please login first')
    return
  }

  const localdb = await findFilesInFolders(
    getServicePath(config.baseDir, 'api')
  )
  const metadata = loadMetadata()
  spinner.succeed('Loaded local config')

  spinner.start('Fetching remote configuration')
  const remoteItems = await getList(config.auth.apiKey, params)
  spinner.succeed('Fecthed remote configuration')

  const statusTable = getStatusTable(metadata.apis, localdb, remoteItems)
  printStatusTable(statusTable)

  spinner.succeed('Done\n')
}

const pull = async (): Promise<void> => {
  console.log('\nReason API\n')
  let spinner = ora().info('Pulling remote changes')
  const config = loadConfig()
  if (!config?.auth) {
    console.error('Please login first')
    return
  }

  const metadata = loadMetadata()
  spinner.succeed('Loaded local config')

  spinner.start('Fetching remote configuration')
  const remoteItems = await getList(config.auth.apiKey, params)
  spinner.succeed('Fetched remote configuration')

  spinner.start('Updating local configurations')
  pullItems(
    getServicePath(config.baseDir, 'api'),
    metadata,
    remoteItems,
    'apis'
  )

  spinner.succeed('Updated local environment')
  spinner.succeed('Done\n')
}

const push = async (): Promise<void> => {
  console.log('\nReason API\n')
  let spinner = ora().info('Deploying local changes')
  const config = loadConfig()
  if (!config?.auth) {
    spinner.fail('Please login first')
    return
  }

  let localdb = await findFilesInFolders(getServicePath(config.baseDir, 'api'))
  const metadata = loadMetadata()
  spinner.succeed('Loaded local config')

  spinner.start('Fetching remote configuration')
  let remoteItems = await getList(config.auth.apiKey, params)
  spinner.succeed('Fetched remote configuration')

  let statusTable = getStatusTable(metadata.apis, localdb, remoteItems)

  if (
    Object.values(statusTable).some(({ status }) =>
      [
        RecordStatus.DELETED_UPSTREAM,
        RecordStatus.CREATED_UPSTREAM,
        RecordStatus.UPDATED_UPSTREAM,
      ].includes(status)
    )
  ) {
    spinner.fail(
      'There are changes upstream. Pull them before deploying your changes'
    )
    return
  }

  for (const key of Object.keys(statusTable)) {
    const s = statusTable[key]
    let localItem = localdb.find(lItem => lItem.filePath === key)
    let mItem = metadata.apis.find(agent => agent.id === key)

    switch (s.status) {
      case RecordStatus.CREATED_LOCAL:
        if (localItem) {
          const agent = await createItem(config.auth.apiKey, localItem, params)
          saveMetadata({
            ...metadata,
            apis: [
              { filePath: localItem.filePath, ...agent },
              ...metadata.apis,
            ],
          })
        } else {
          spinner.fail(`Could not find local item at ${key}`)
        }
        break

      case RecordStatus.DELETED_LOCAL:
        mItem = metadata.apis.find(item => item.id === key)
        if (mItem) {
          await deleteItem(config.auth.apiKey, mItem, params)
        } else {
          spinner.fail(`Could not find "${key}" to remove in meta data`)
        }
        break

      case RecordStatus.UPDATED_LOCAL:
        localItem = localdb.find(lAgent => lAgent.filePath === mItem?.filePath)
        if (localItem) {
          await updateItem(
            config.auth.apiKey,
            { ...localItem, id: key },
            params
          )
        } else {
          spinner.info(`Could not find local item at ${key}`)
        }
        break
    }
  }

  spinner.start('Syncing configurations')
  remoteItems = await getList(config.auth.apiKey, params)
  pullItems(
    getServicePath(config.baseDir, 'api'),
    metadata,
    remoteItems,
    'apis'
  )
  spinner.succeed('Synced configurations')

  statusTable = getStatusTable(loadMetadata().apis, localdb, remoteItems)
  printStatusTable(statusTable)

  spinner.succeed('Done\n')
}

export const apiAdd = async (): Promise<void> => {
  console.log('\nAdd Reason API\n')
  let spinner = ora()
  const config = loadConfig()
  if (!config?.auth) {
    spinner.fail('Please login first')
    return
  }

  const localdb = await findFilesInFolders(
    getServicePath(config.baseDir, 'api')
  )
  const localFunctions = await findFilesInFolders(
    getServicePath(config.baseDir, 'functions')
  )
  const opts = { onCancel: () => process.exit() }

  spinner.info('A single API can perform multiple functions/requests')
  spinner.info(
    'Create domain-based APIs and use each to handle the domain requests\n'
  )
  spinner.info('e.g weatherAPI')

  const questions: PromptObject[] = [
    {
      message: 'Enter API name',
      type: 'text',
      name: 'name',
      initial: `api${nanoid(8).split('-').join()}`,
      validate: text => /^[A-z0-9_]{3,64}$/.test(text),
    },
    {
      message: 'Write the main instruction for the model',
      type: 'text',
      name: 'instruction',
      validate: text => !!text.trim(),
    },
    {
      message: 'Select a generative model to use',
      type: 'select',
      name: 'model',
      choices: [
        { title: 'claude-3.5-sonnet', value: 'claude-3.5-sonnet' },
        { title: 'gpt-4o-mini', value: 'gpt-4o-mini' },
        { title: 'gpt-4o', value: 'gpt-4o' },
        { title: 'gpt-3.5', value: 'gpt-3.5' },
      ],
    },
    {
      message: 'Response format',
      type: 'select',
      name: 'responseFormat',
      choices: [
        { title: 'JSON', value: 'json_object' },
        { title: 'Text', value: 'text' },
      ],
    },
  ]

  let answers = await prompts(questions, opts)

  if (localdb.find(f => f.name === answers.name)) {
    spinner.fail('An API with the given name already exists')
    process.exit()
  }

  if (localFunctions.length) {
    const choices = localFunctions.map(file => ({
      title: file.name,
      value: file.name,
    }))

    console.log()
    spinner.info('Select functions to attach to the API')
    const { tools } = await prompts([
      {
        instructions: false,
        name: 'tools',
        message: 'Select tools to attach (multiple)',
        type: 'multiselect',
        hint: 'Function',
        choices,
      },
    ])
    answers.tools = (tools as string[]).map(name => ({
      name,
      type: 'function',
    }))
  }

  updateFileContent(
    config,
    path.resolve(getServicePath(config.baseDir, 'api'), answers.name),
    answers
  )

  console.log()
  spinner.succeed('Reason API has been created successfully')
  spinner.info(`You can edit it later in ./reason/api/${answers.name}\n`)
  console.log()
  spinner.succeed('To deploy the api, run reason api push')
}

export const run = async (): Promise<void> => {
  console.log('\nRun Reason API\n')
  let spinner = ora()
  const config = loadConfig()
  if (!config?.auth) {
    spinner.fail('Please login first')
    return
  }

  const metadata = loadMetadata()

  const options = await prompts(
    [
      {
        name: 'api',
        message: 'Select Inference API to run',
        type: 'select',
        choices: metadata.apis.map(api => ({
          title: api.name,
          value: api,
          description: api.description,
        })),
        validate: item => !!item.id,
      },
      {
        name: 'message',
        message: 'Enter the request message',
        type: 'text',
        hint: 'Request message can be a json string',
        validate: msg => !!msg,
      },
    ],
    { onCancel: () => process.exit() }
  )

  const start = new Date()
  const response = await runApi(config.auth.apiKey, options)
  const end = new Date()
  const duration = (end.valueOf() - start.valueOf()) / 1000

  console.log()
  console.log(JSON.stringify(response, null, 2))
  spinner.succeed(`Finished in ${duration}s`)
  return
}

export { status, pull, push }
