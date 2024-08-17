export type LocalFile = {
  name: string
  filePath: string
  [x: string]: any
}

export type RemoteItem = {
  name: string
  lastUpdated: number
  id: string
  organisationId: string
  createdAt: string
  [x: string]: any
}

export type MetaItem = RemoteItem & {
  filePath: string
}

export type LocalAgent = {
  name: string
  kind: string
  instruction: string
}

export type RemoteAgent = LocalAgent & {
  lastUpdated: number
  id: string
  organisationId: string
  createdAt: string
}

export type AgentMetadata = RemoteAgent & {
  filePath: string
}

export type LocalAgentWithFilePath = LocalAgent & {
  filePath: string
}

export type Metadata = {
  functions: MetaItem[]
  apis: MetaItem[]
}

export type Config = {
  baseDir: string
  metaDataFile: string
  configFormat: 'json' | 'yaml'
  auth?: {
    apiKey: string
    id: string
    type: string
    organizationId: string
    createdAt: string
    expiresAt: string | null
    loginDate: string
    user: {
      firstName: string
      lastName: string
    }
  }
}

export type LocalFunction = {
  name: string
}
export type LocalFunctionWithFilePath = LocalFunction & {
  filePath: string
}

export type RemoteFunction = RemoteItem & {
  config: string
}
