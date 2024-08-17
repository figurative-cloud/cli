import ora from 'ora'
import { toFileObject } from '../utils'
import type { LocalFile, MetaItem, RemoteItem } from './types'
import deepEqual from 'deep-equal'

export enum RecordStatus {
  CREATED_UPSTREAM,
  CREATED_LOCAL,
  UPDATED_UPSTREAM,
  UPDATED_LOCAL,
  DELETED_UPSTREAM,
  DELETED_LOCAL,
  UNCHANGED,
}

export const statusText: Record<RecordStatus, string> = {
  [RecordStatus.CREATED_LOCAL]: 'Created locally',
  [RecordStatus.DELETED_LOCAL]: 'Deleted locally',
  [RecordStatus.UPDATED_LOCAL]: 'Updated locally',
  [RecordStatus.CREATED_UPSTREAM]: 'Created upstream',
  [RecordStatus.DELETED_UPSTREAM]: 'Deleted upstream',
  [RecordStatus.UPDATED_UPSTREAM]: 'Updated upstream',
  [RecordStatus.UNCHANGED]: 'Unchanged',
}

const toStatus = (item: { name: string }, status: RecordStatus) => ({
  status,
  name: item.name,
})

export const getStatusTable = <
  M extends MetaItem,
  T extends RemoteItem,
  L extends LocalFile,
>(
  metaItems: M[],
  fileContents: L[],
  remoteItems: T[]
) => {
  const statusTable: Record<string, { status: RecordStatus; name: string }> = {}

  for (const rItem of remoteItems) {
    const mItem = metaItems.find(mAgent => mAgent.id === rItem.id)
    if (!mItem) {
      statusTable[rItem.id] = toStatus(rItem, RecordStatus.CREATED_UPSTREAM)
      continue
    }

    if (mItem.lastUpdated < rItem.lastUpdated) {
      statusTable[mItem.id] = toStatus(rItem, RecordStatus.UPDATED_UPSTREAM)
      continue
    }

    if (mItem.lastUpdated === rItem.lastUpdated) {
      statusTable[mItem.id] = toStatus(rItem, RecordStatus.UNCHANGED)
      continue
    }
  }

  fileContents.forEach(lAgent => {
    const mItem = metaItems.find(mAgent => mAgent.filePath === lAgent.filePath)

    if (!mItem) {
      // use filePath as id
      statusTable[lAgent.filePath] = toStatus(
        lAgent,
        RecordStatus.CREATED_LOCAL
      )
      return
    }

    if (!deepEqual(lAgent, toFileObject(mItem))) {
      statusTable[mItem.id] = toStatus(mItem, RecordStatus.UPDATED_LOCAL)
    }
  })

  metaItems.forEach(mAgent => {
    if (!remoteItems.find(rAgent => rAgent.id === mAgent.id)) {
      statusTable[mAgent.id] = toStatus(mAgent, RecordStatus.DELETED_UPSTREAM)
      return
    }

    // localdb does not have id, we check by filename
    const localContent = fileContents.find(
      lAgent => lAgent.filePath === mAgent.filePath
    )

    if (!localContent) {
      statusTable[mAgent.id] = toStatus(mAgent, RecordStatus.DELETED_LOCAL)
      return
    }
  })

  return statusTable
}

export const printStatusTable = (
  statusTable: ReturnType<typeof getStatusTable>
) => {
  const gray = '\x1b[90m'
  const reset = '\x1b[0m'

  console.log()
  ora().info('Status report\n')
  Object.values(statusTable).map(item =>
    console.log(
      '%s>%s %s => %s',
      gray,
      reset,
      item.name.padEnd(20),
      statusText[item.status]
    )
  )

  console.log()
}
