import * as path from 'path'
import ora from 'ora'
import prompts, { PromptObject } from 'prompts'
import { nanoid } from 'nanoid/non-secure'

import { loadMetadata, saveMetadata } from '../lib/meta'
import { findFilesInFolders } from '../lib/read-local'
import { createItem, deleteItem, getList, updateItem } from '../lib/api'
import { loadConfig } from '../lib/config'
import { RecordStatus, getStatusTable, printStatusTable } from '../lib/status'
import { pullItems, updateFileContent } from '../lib/pull'
import { getServicePath, terms } from '../lib/utils'

const params = {
  label: terms.Function,
  uri: '/functions',
}

export const getFunctionsStatus = async (): Promise<void> => {
  console.log('Reason Functions\n')
  let spinner = ora()

  const config = loadConfig()
  if (!config?.auth) {
    spinner.fail('Please login first')
    process.exit(1)
  }

  const localdb = await findFilesInFolders(
    getServicePath(config.baseDir, 'functions')
  )
  const metadata = loadMetadata()
  spinner.succeed('Loaded local config')

  spinner.start('Fetching remote configuration')
  const remoteItems = await getList(config.auth.apiKey, params)
  spinner.succeed('Fetched remote configuration')

  const statusTable = getStatusTable(metadata.functions, localdb, remoteItems)
  printStatusTable(statusTable)

  spinner.succeed('Done\n')
}

export const pullFunctions = async (): Promise<void> => {
  console.log('\nReason Functions\n')
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
    getServicePath(config.baseDir, 'functions'),
    metadata,
    remoteItems,
    'functions'
  )

  spinner.succeed('Updated local environment')
  spinner.succeed('Done\n')
}

export const pushFunction = async (): Promise<void> => {
  console.log('\nReason Functions\n')
  let spinner = ora().info('Deploying local changes')
  const config = loadConfig()
  if (!config?.auth) {
    spinner.fail('Please login first')
    return
  }

  let localdb = await findFilesInFolders(
    getServicePath(config.baseDir, 'functions')
  )
  const metadata = loadMetadata()
  spinner.succeed('Loaded local config')

  spinner.start('Fetching remote configuration')
  let remoteItems = await getList(config.auth.apiKey, params)
  spinner.succeed('Fetched remote configuration')

  let statusTable = getStatusTable(metadata.functions, localdb, remoteItems)

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
    let localItem = localdb.find(lFunc => lFunc.filePath === key)
    let mItem = metadata.functions.find(mFunc => mFunc.id === key)

    switch (s.status) {
      case RecordStatus.CREATED_LOCAL:
        if (localItem) {
          const f = await createItem(config.auth.apiKey, localItem, params)
          saveMetadata({
            ...metadata,
            functions: [
              { filePath: localItem.filePath, ...f },
              ...metadata.functions,
            ],
          })
        } else {
          spinner.fail(`Could not find local item at ${key}`)
        }
        break

      case RecordStatus.DELETED_LOCAL:
        mItem = metadata.functions.find(mFunc => mFunc.id === key)
        if (mItem) {
          await deleteItem(config.auth.apiKey, mItem, params)
        } else {
          spinner.fail(`Could not find "${key}" to remove in meta data`)
        }
        break

      case RecordStatus.UPDATED_LOCAL:
        localItem = localdb.find(lFunc => lFunc.filePath === mItem?.filePath)
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
    getServicePath(config.baseDir, 'functions'),
    metadata,
    remoteItems,
    'functions'
  )
  spinner.succeed('Synced configurations')

  statusTable = getStatusTable(loadMetadata().functions, localdb, remoteItems)
  printStatusTable(statusTable)

  spinner.succeed('Done\n')
}

export const addFunction = async (): Promise<void> => {
  console.log('\nReason Functions\n')
  let spinner = ora().info('Deploying local changes')
  const config = loadConfig()
  if (!config?.auth) {
    spinner.fail('Please login first')
    return
  }

  const localdb = await findFilesInFolders(
    getServicePath(config.baseDir, 'functions')
  )
  const opts = { onCancel: () => process.exit() }

  const questions: PromptObject[] = [
    {
      message: 'Enter function name',
      type: 'text',
      name: 'name',
      initial: `function${nanoid(8)}`,
      validate: text => /^[A-z0-9_]{3,64}$/.test(text),
    },
    {
      message: 'Description',
      type: 'text',
      name: 'description',
    },
    {
      message: 'Invocation type',
      type: 'select',
      name: 'invocation_type',
      choices: [
        { title: 'Rest API', value: 'rest_api' },
        {
          title: 'Serverless Function (any provider)',
          value: 'serverless_function',
        },
      ],
    },
    {
      message: 'Cloud provider',
      type: 'select',
      name: 'invocation_provider',
      choices: [
        { title: 'AWS', value: 'aws' },
        {
          title: 'Google',
          value: 'gcp',
        },
        {
          title: 'Azure',
          value: 'azure',
        },
        { title: 'None', value: '' },
      ],
    },
  ]

  let { invocation_type, invocation_provider, ...answers } = await prompts(
    questions,
    opts
  )
  answers.invocation = { type: invocation_type }
  if (invocation_provider) {
    answers.invocation.provider = invocation_provider
  }

  if (localdb.find(f => f.name === answers.name)) {
    spinner.fail('A function with the given name already exists')
    process.exit()
  }
  if (answers.invocation.type === 'rest_api') {
    console.log()
    spinner.info('Configure the REST API URL. (use {var} to add variables)')
    spinner.info('You can add values for the variables later')
    const apiAnswers = await prompts([
      {
        name: 'api_url',
        message: 'REST API endpoint ',
        type: 'text',
        validate: text => {
          try {
            new URL(text)
            return true
          } catch (error) {
            return false
          }
        },
      },
    ])
    answers.invocation.api_url = apiAnswers.api_url
  }

  if (answers.invocation.type === 'serverless_function') {
    console.log()
    const msg = {
      none: 'Serverless function identifier',
      aws: 'Add AWS lambda ARN',
      gcp: 'Add GCP Function Name',
      azure: 'Add Azure Function App Name',
    }
    const fmsg =
      msg[(answers.invocation.provider as keyof typeof msg) ?? 'none']
    const sfAnswers = await prompts(
      [
        {
          name: 'id',
          message: fmsg,
          type: 'text',
        },
      ],
      opts
    )
    answers.invocation.serverless_function_id = sfAnswers.id
  }

  const choices = [
    {
      title: 'None',
      value: '',
      description: 'No auth required to access your external service',
    },
    { title: 'Access key id/secret', value: 'access_key' },
    {
      title: 'Bearer token',
      value: 'bearer_token',
      description: 'Mostly used with APIs',
    },
  ]

  // if (answers.invocation.provider === 'gcp') {
  // choices.push({ title: 'GCP Service account', value: 'gcp_service_account' })
  // }

  const { auth_type } = await prompts(
    [
      {
        type: 'select',
        message: 'Authentication type',
        hint: 'Choose how we will authenticate your external service',
        name: 'auth_type',
        choices,
      },
    ],
    opts
  )
  if (auth_type !== 'none') {
    answers.invocation.auth = {}
  }

  if (auth_type === 'bearer_token') {
    const { bearer_token } = await prompts([
      {
        message: 'Enter the bearer token value',
        name: 'bearer_token',
        type: 'text',
      },
    ])
    answers.invocation.auth.bearer_token = bearer_token
  }

  if (auth_type === 'access_key') {
    const access_keys = await prompts([
      {
        message: 'Enter the access key id',
        name: 'access_key_id',
        type: 'text',
      },
      {
        message: 'Enter the access key secret',
        name: 'access_key_secret',
        type: 'invisible',
      },
    ])
    answers.invocation.auth = {
      ...answers.invocation.auth,
      ...access_keys,
    }
  }

  console.log()
  spinner.succeed(`Main function configuration done`)
  spinner.info(
    `. You can edit it later in ./reason/${terms.functions}/${answers.name}\n`
  )
  spinner.succeed(
    `You can also add env variables and request headers by editing the configs`
  )

  updateFileContent(
    config,
    path.resolve(getServicePath(config.baseDir, 'functions'), answers.name),
    answers
  )
  spinner.succeed('Reason function has been created successfully')
  spinner.succeed(
    `To deploy the function, run ${terms.cmd} ${terms.function_cmd} push`
  )
}
