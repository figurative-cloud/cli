import * as fs from 'fs'
import * as path from 'path'
import ora from 'ora'
import prompts, { PromptObject } from 'prompts'
import { deleteConfig, initConfig, loadConfig } from '../lib/config'
import { cleanupMeta, initMeta } from '../lib/meta'
import { sprintf } from '../lib/utils'
import { login } from '../lib/auth'

export const removeReasonAI = () => {
  const spinner = ora()
  const config = loadConfig()
  if (!config) {
    spinner.fail(
      "Could not load config. You'll have to perform manual clean up"
    )
    return
  }

  const agentsDir = path.resolve(config.baseDir, 'agents')
  const functionsDir = path.resolve(config.baseDir, 'functions')
  const metaPath = path.resolve(config.baseDir, config.metaDataFile)

  if (fs.existsSync(agentsDir)) {
    fs.rmSync(agentsDir, { recursive: true, force: true })
  }

  if (fs.existsSync(functionsDir)) {
    fs.rmSync(functionsDir, { recursive: true, force: true })
  }

  cleanupMeta(metaPath)
  deleteConfig()
  fs.rmSync(config.baseDir, { recursive: true, force: true })

  spinner.succeed('Done')
}

export const initReasonAI = async () => {
  const spinner = ora()
  spinner.info('Reason env initialization\n')
  let config = loadConfig()
  if (config) {
    spinner.warn(
      'Cannot reinitialize environment. Use reset to clean up first\n'
    )
    process.exit(0)
  }

  const questions: PromptObject[] = [
    {
      type: 'select',
      name: 'configFormat',
      message: 'How will you edit the service configurations locally?',
      choices: [
        { title: 'JSON', value: 'json' },
        { title: 'YAML', value: 'yaml' },
      ],
    },
  ]

  const answers = await prompts(questions, { onCancel: () => process.exit() })

  spinner.start('Initializing local configuration')
  config = initConfig({ configFormat: answers.configFormat })
  spinner.succeed('Local config created')

  spinner.start('Initializing meta data')
  initMeta()
  spinner.succeed('Meta data initialized')
  console.log()

  const { shouldLogin } = await prompts(
    [
      {
        name: 'shouldLogin',
        message: 'Proceed with login?',
        type: 'confirm',
        initial: true,
      },
    ],
    { onCancel: () => process.exit() }
  )

  if (shouldLogin) {
    await login()
  }

  const gray = '\x1b[90m'
  const reset = '\x1b[0m'

  console.log('\n\n')
  spinner.succeed('Your local environment is ready')
  spinner.info('To get started, try one of the following:\n')

  console.log(
    sprintf(
      `${gray} > ${reset}%s\n${gray} > ${reset}%s\n${gray} > ${reset}%s\n${gray} > ${reset}%s`,
      `reason help ${gray} View all command options${reset}`,
      `reason pull ${gray} Pull entire environment${reset}`,
      `reason api add ${gray}Add a new Reason API${reset}`,
      `reason function pull ${gray}Pull your functions${reset}`
    )
  )

  console.log('Happy coding!\n')
}
