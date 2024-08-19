#!/usr/bin/env node

import {
  addFunction,
  pullFunctions,
  pushFunction,
  getFunctionsStatus,
} from './functions'
import { removeReasonAI, initReasonAI } from './general'
import {
  getIntegralStatus,
  pullIntegrals,
  pushIntegrals,
  addIntegral,
  run,
} from './integral'
import { login, logout, whoami } from './lib/auth'
import { terms } from './lib/utils'
import pkg from '../package.json'

const gray = '\x1b[90m'
const reset = '\x1b[0m'

const padCmd = (cmd: string) => cmd.padEnd(11)
const arrow = `${gray}>${reset}`

const runHelp = () => {
  console.log('\nCLI tool for the Reason platform\n')
  console.log(`Usage: ${terms.cmd} [SERVICE] COMMAND [OPTIONS]\n`)
  console.log('COMMANDS:')
  Object.keys(cmds).map(key => {
    console.log(`\n${gray}%s${reset}`, key)
    Object.keys((cmds as any)[key])?.map(cmd => {
      console.log(padCmd(cmd), ((cmds as any)[key] as any)[cmd])
    })
  })
  console.log()
}

const cmds = {
  [terms.cmd]: {
    [`${arrow} ${terms.function_cmd}`]:
      'Perform actions related to Reason Functions',
    help: 'Display this help information',
    init: 'Initialize the local environment',
    [`${arrow} ${terms.integral_cmd}`]: `Perform actions related to Reason ${terms.Integrals}`,
    login: 'Log in to an organization',
    logout: 'Log out from an organization',
    pull: 'Pull all remote changes',
    push: 'Deploy all local changes',
    request: `Run an ${terms.Integral} by passing in parameters`,
    reset: 'Clean up the local environment',
    status: 'Show the diff between local and deployed env',
    version: 'Check the current version of the CLI tool',
    whoami: 'Check who you are logged in as',
  },
  [terms.function_cmd]: {
    add: 'Add a new Reason Function',
    help: 'Display this help information',
    pull: 'Pull all remote functions',
    push: 'Deploy all local functions',
    status: 'Show the diff between local and deployed functions',
  },
  [terms.integral_cmd]: {
    add: `Add a new ${terms.Integral}`,
    help: 'Display this help information',
    pull: `Pull all remote ${terms.Integrals}`,
    push: `Deploy all local ${terms.Integrals}`,
    status: `Show the diff between local and deployed ${terms.Integrals}`,
  },
}

const main = async (): Promise<void> => {
  const [command, y] = process.argv.slice(2)

  try {
    if (command === 'init') {
      await initReasonAI()
    } else if (command === 'reset') {
      removeReasonAI()
    } else if (['version', '-v', '--version'].includes(command)) {
      console.log(`Version: ${pkg.version}\n`)
    } else if (command === 'whoami') {
      whoami()
    } else if (command === 'login') {
      await login()
    } else if (command === 'logout') {
      logout()
    } else if (command === 'status') {
      await getIntegralStatus()
      await getFunctionsStatus()
    } else if (command === 'pull') {
      await pullIntegrals()
      await pullFunctions()
    } else if (command === 'push') {
      await pushIntegrals()
      await pushFunction()
    } else if (command === 'request') {
      await run()
    } else if (command === terms.integral_cmd) {
      if (y === 'help') {
        console.log(`\nSubcommand to manage Reason ${terms.Integrals}\n`)
        console.log(
          `Usage: ${terms.cmd} ${terms.integral_cmd} COMMAND [OPTIONS]\n`
        )
        console.log('COMMANDS:')
        Object.keys(cmds[terms.integral_cmd])?.map(cmd => {
          console.log(padCmd(cmd), (cmds[terms.integral_cmd] as any)[cmd])
        })

        console.log()
      } else if (y === 'push') {
        await pushIntegrals()
      } else if (y === 'pull') {
        await pullIntegrals()
      } else if (y === 'status') {
        await getIntegralStatus()
      } else if (y === 'add') {
        await addIntegral()
      }
    } else if (command === terms.function_cmd) {
      if (y === 'help') {
        console.log('\nSubcommand to manage Reason Functions\n')
        console.log(
          `Usage: ${terms.cmd} ${terms.function_cmd} COMMAND [OPTIONS]\n`
        )
        console.log('COMMANDS:')
        Object.keys(cmds[terms.function_cmd])?.map(cmd => {
          console.log(padCmd(cmd), (cmds[terms.function_cmd] as any)[cmd])
        })

        console.log()
      } else if (y === 'push') {
        await pushFunction()
      } else if (y === 'pull') {
        await pullFunctions()
      } else if (y === 'status') {
        await getFunctionsStatus()
      } else if (y === 'add') {
        await addFunction()
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
