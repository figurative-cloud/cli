#!/usr/bin/env node

import {
  functionAdd,
  functionPull,
  functionPush,
  functionsStatus,
} from './functions'
import { cleanup, init } from './general'
import { status, pull, push, apiAdd, run } from './inference'
import { auth } from './lib/auth'

const padCmd = (cmd: string) => cmd.padEnd(10)

const runHelp = () => {
  console.log('Usage:  reason [SERVICE] COMMAND [OPTIONS]')
  console.log('\nCli tool for the reason platform')
  Object.keys(cmds).map(key => {
    console.log(`\n${key}`)
    Object.keys((cmds as any)[key])?.map(cmd => {
      console.log(padCmd(cmd), ((cmds as any)[key] as any)[cmd])
    })
  })
}

const cmds = {
  '': {
    api: 'Perform actions related to Reason API',
    function: 'Perform actions related to Reason Functions',
    init: 'Initialize the local environment',
    login: 'Log in to an organization',
    logout: 'Log out from an organization',
    pull: 'Pull all remote changes',
    push: 'Deploy all local changes',
    request: 'Run an Inference API by passing in parameters',
    reset: 'Clean up the local environment',
    status: 'Show the diff between local and deployed env',
    whoami: 'Check who you are logged in as',
  },
  function: {
    add: 'Add a new Reason Function',
    pull: 'Pull all remote functions',
    push: 'Deploy all local functions',
    status: 'Show the diff between local and deployed functions',
  },
  api: {
    pull: 'Pull all remote functions',
    push: 'Deploy all local functions',
    status: 'Show the diff between local and deployed functions',
  },
}

const main = async (): Promise<void> => {
  const [command, y, z] = process.argv.slice(2)
  const { login, logout, whoami } = auth()

  try {
    if (command === 'init') {
      await init()
    } else if (command === 'reset') {
      cleanup()
    } else if (command === 'whoami') {
      whoami()
    } else if (command === 'login') {
      await login()
    } else if (command === 'logout') {
      logout()
    } else if (command === 'status') {
      await status()
      await functionsStatus()
    } else if (command === 'pull') {
      await pull()
      await functionPull()
    } else if (command === 'push') {
      await push()
      await functionPush()
    } else if (command === 'request') {
      await run()
    } else if (command === 'api') {
      if (y === 'help') {
        console.log('\nSubcommand to manage Reason API\n')
        console.log('Usage: reason api COMMAND [OPTIONS]\n')
        Object.keys(cmds['api'])?.map(cmd => {
          console.log(padCmd(cmd), (cmds['api'] as any)[cmd])
        })
      }
      if (y === 'push') {
        await push()
      }
      if (y === 'pull') {
        await pull()
      }
      if (y === 'status') {
        await status()
      }
      if (y === 'add') {
        await apiAdd()
      }
    } else if (command === 'function') {
      if (y === 'help') {
        console.log('\nSubcommand to manage Reason Functions\n')
        console.log('Usage: reason function COMMAND [OPTIONS]\n')
        Object.keys(cmds['function'])?.map(cmd => {
          console.log(padCmd(cmd), (cmds['function'] as any)[cmd])
        })
      }
      if (y === 'push') {
        await functionPush()
      }
      if (y === 'pull') {
        await functionPull()
      }
      if (y === 'status') {
        await functionsStatus()
      }
      if (y === 'add') {
        await functionAdd()
      }
    } else if (command === 'help') {
      runHelp()
    } else {
      console.error(`Unknown command: ${command ?? ''}\n`)
      runHelp()
      process.exit(1)
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(1)
  }
}

main()
