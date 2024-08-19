import ora from 'ora'

import type { LocalFile, MetaItem, RemoteItem } from './types'
import { sprintf } from './utils'

const h = 'https://localhost:3001'
export const HOST = `${h}/api/v1`
export const HOST_AUTH = `${h}/api`

const printValidationErrors = (data: any) => {
  const spinner = ora()
  data.issues?.map((issue: any) =>
    spinner.warn(
      sprintf(
        '%s; %s on field "%s".',
        // '%s; %s on field "%s". Expected %s but got %s',
        issue.message,
        issue.code.split('_').join(' '),
        issue.path?.join('.'),
        issue.expected,
        issue.received
      )
    )
  )
}

export const getList = async (
  apiKey: string,
  { label, uri }: { label: string; uri: string }
): Promise<RemoteItem[]> => {
  const spinner = ora()
  try {
    const response = await fetch(`${HOST}${uri}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await response.json()
    if (!response.ok) {
      spinner.fail(`Error fetching ${label}s. ${data.message}`)
      return []
    }
    return data
  } catch (error) {
    spinner.fail(`Unknown error. Could not fetch ${label}`)
    return []
  }
}

export const createItem = async (
  apiKey: string,
  item: LocalFile,
  { label, uri }: { label: string; uri: string }
): Promise<RemoteItem> => {
  const spinner = ora().start(`Creating ${label} ${item.name}`)
  try {
    const { filePath: _, ...input } = item

    const response = await fetch(`${HOST}${uri}`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const data = await response.json()
    if (!response.ok) {
      spinner.fail(`Error creating ${item.name}. ${data.message}`)

      if (response.status === 400) {
        printValidationErrors(data)
      }
      process.exit()
    }

    spinner.succeed(`${item.name} created`)
    return data
  } catch (error) {
    spinner.fail(`Unknown error. Could not create ${label}`)
    console.log(error)
    process.exit(1)
  } finally {
    spinner.stop()
  }
}

export const deleteItem = async (
  apiKey: string,
  item: MetaItem,
  { label, uri }: { label: string; uri: string }
): Promise<boolean> => {
  const spinner = ora(`Deleting ${label} "${item.name}"`).start()
  try {
    const response = await fetch(`${HOST}${uri}/${item.id}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const data = await response.json()
    if (!response.ok) {
      spinner.fail(`Error removing ${label} "${item.name}". ${data.message}`)

      if (response.status === 400) {
        printValidationErrors(data)
      }
      return false
    }

    spinner.succeed(`Removed ${label} "${item.name}"`)
    return true
  } catch (error) {
    spinner.fail(`Unknown error. Could not delete ${label}`)
    return false
  } finally {
    spinner.stop()
  }
}

export const updateItem = async (
  apiKey: string,
  item: LocalFile & { id: string },
  { label, uri }: { label: string; uri: string }
): Promise<RemoteItem> => {
  const spinner = ora(`Updating ${label} "${item.name}"`).start()
  const { filePath: _, ...input } = item

  try {
    const response = await fetch(`${HOST}${uri}/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const data = await response.json()
    if (!response.ok) {
      spinner.fail(`Error updating ${label} "${item.name}". ${data.message}`)

      if (response.status === 400) {
        printValidationErrors(data)
      }
      process.exit()
    }

    spinner.succeed(`Updated ${label} "${item.name}"`)
    return data
  } catch (error) {
    spinner.fail(`Unknown error. Could not update ${label}`)
    process.exit(1)
  } finally {
    spinner.stop()
  }
}

type RunResult = {
  id: string
  threadId?: string
  messages: {
    id: string
    role: 'assistant'
    content: { text: string; type: 'text' }[]
  }
}
export const runIntegral = async (
  apiKey: string,
  options: { integral: MetaItem; message: string }
): Promise<RunResult> => {
  const spinner = ora(`Running ${options.integral.name}`).start()

  try {
    const response = await fetch(`${HOST}/apis/request`, {
      method: 'POST',
      body: JSON.stringify({
        apiId: options.integral.id,
        messages: [{ role: 'user', content: options.message }],
      }),
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const data = await response.json()
    if (!response.ok) {
      console.log(data)
      spinner.fail(`Error running Inference API ${data.message}`)

      if (response.status === 400) {
        printValidationErrors(data)
      }
      process.exit()
    }

    spinner.succeed(`Request completed`)
    return data
  } catch (error) {
    spinner.fail(`Unknown error. Request failed`)
    process.exit(1)
  } finally {
    spinner.stop()
  }
}
