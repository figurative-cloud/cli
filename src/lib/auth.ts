import ora from 'ora'
import { sprintf } from '../utils'
import { HOST, HOST_AUTH } from './api'
import { loadConfig, saveConfig } from './config'
import prompts from 'prompts'
import { Config } from './types'

export const auth = () => {
  const spinner = ora()
  let config = loadConfig()

  const login = async () => {
    if (config?.auth?.apiKey) {
      spinner.warn(
        sprintf(
          'Already logged in as %s.',
          config.auth?.user.firstName ?? 'unknown'
        )
      )
      return
    }

    const { apiKey } = await prompts(
      [
        {
          name: 'apiKey',
          message: 'Enter your API Key',
          type: 'text',
          hint: 'Visit your Reason account and generate an api key in settings',
          validate: text => /^[A-z0-9-_]{1,32}$/.test(text),
        },
      ],
      { onCancel: () => process.exit() }
    )

    if (!apiKey) {
      spinner.fail('API key is required to log in.')
      return
    }

    try {
      spinner.start('Logging in with provided API Key')
      const res = await fetch(`${HOST_AUTH}/auth/cli`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        method: 'POST',
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (res.status === 401) {
        spinner.fail(data.error ?? 'Could not validate api token.')
        process.exit(1)
      }

      if (!data.user || !data.auth) {
        spinner.fail('Login failed. Please try again.')
        process.exit(1)
      }

      saveConfig({
        ...config,
        auth: {
          apiKey,
          ...data.auth,
          user: data.user,
          loginDate: data.loginDate,
        },
      } as Config)
      spinner.succeed('Login successful')
      whoami()
    } catch (error) {
      console.log(error)
      spinner.fail('An unknown error occured')
    }
  }

  const logout = () => {
    const spinner = ora()
    const config = loadConfig()
    if (config) {
      delete config.auth

      saveConfig({ ...config })
      spinner.succeed('Logout successful')
    } else {
      spinner.fail('Cannot find config.json')
    }
  }

  const whoami = () => {
    const spinner = ora()
    config = loadConfig()
    if (config?.auth?.apiKey) {
      spinner.info(
        sprintf('Logged in as %s', config.auth?.user.firstName ?? 'unknown')
      )
    } else {
      spinner.warn('You are currently not logged in.')
    }
  }

  return { login, logout, whoami }
}
