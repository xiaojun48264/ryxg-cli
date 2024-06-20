import { Input } from '@/commands'
import { BuildAction } from './build.action'
import ora from 'ora'
import prompts from 'prompts'
import chalk from 'chalk'
import { compileProject, getManifest, getUnpackagePath, isCliProject } from '@/lib/utils/tools'
import path from 'node:path'
import { Mobile } from '@/lib/utils/mobile'
import { createLauncher } from '@/lib/launchers'
import { DeviceLauncher } from '@/lib/launchers/deviceLauncher'
import { printLog } from '@/lib/utils/logs'

export interface RunConfig {
  adbPath: string
  androidBasePath: string
  androidSimulatorPort: string
  appName: string
  appid: string
  compilePath: string
  isCli: boolean
  model: string
  name: string
  pagePath: string
  pageQuery: string
  platform: string
  projectNatureId: string
  projectPath: string
  uuid: string
  version: string
  mobile: Mobile
  deviceLauncher: DeviceLauncher
}

export class RunAction extends BuildAction {
  public async handle(commandInputs: Input[], commandOptions: Input[]) {
    const platform = commandInputs.find(input => input.name === 'platform')?.value
    const isCustomBase = commandOptions.find(option => option.name === 'custom')?.value as boolean
    const projectPath = commandOptions.find(option => option.name === 'path')?.value as string
    const spinner = ora('获取设备列表...').start()
    const launcher = createLauncher(platform as string)!
    const deviceList = await launcher.getMobileList()
    spinner.stop()

    if (deviceList.length === 0) {
      console.log(chalk.red('✖') + ' 未找到可用设备')
      process.exit(1)
    }

    const manifest = await getManifest(projectPath)

    const config: RunConfig = {
      adbPath: '',
      androidBasePath: '',
      androidSimulatorPort: '26944',
      appName: manifest.name || '',
      appid: manifest.appid || '',
      compilePath: '',
      isCli: isCliProject(projectPath),
      model: '',
      name: '',
      pagePath: '',
      pageQuery: '',
      platform: platform as string,
      projectNatureId: 'UniApp_Vue',
      projectPath,
      uuid: '',
      version: '',
      mobile: {} as Mobile,
      deviceLauncher: new DeviceLauncher(),
    }

    if (platform === 'android') {
      const result = await prompts(
        [
          {
            name: 'udid',
            type: 'select',
            message: '选择运行设备',
            choices: deviceList.map(device => {
              return {
                title: device.name,
                value: device.udid,
              }
            }),
          },
        ],
        {
          onCancel() {
            console.log(chalk.red('✖') + ' 操作被取消')
            process.exit(1)
          },
        }
      )
      const device = deviceList.find(device => device.udid === result.udid)!
      Object.assign(config, {
        name: device?.name,
        platform: device?.platform,
        uuid: device?.udid,
        version: device?.version,
        mobile: device,
      })
    }
    appendCompilePath(config)
    await appendBaseInfo(config, isCustomBase)
    const result = await compileProject(config)
    if (!result) {
      console.log(chalk.red('✖') + ' 编译失败')
      process.exit(1)
    }
    printLog('编译成功', 'success')
    await config.deviceLauncher.runDevice(config)
  }
}

function appendCompilePath(config: RunConfig) {
  let unpackageForderName = 'unpackage'
  if (config.isCli) {
    unpackageForderName = ''
  }
  config.compilePath = path.resolve(config.projectPath, unpackageForderName, 'dist', 'dev', 'app')
}

async function appendBaseInfo(config: RunConfig, isCustomBase: boolean) {
  if (isCustomBase) {
    let mUnpackagePath = getUnpackagePath(config.isCli, config.projectPath)
    if (config.platform == 'android') {
      config.androidBasePath = path.resolve(mUnpackagePath, 'debug', 'android_debug.apk')
    }
  }
}
