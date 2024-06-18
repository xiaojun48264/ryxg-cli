import { fileURLToPath, URL } from 'node:url'
import { Mobile } from '../utils/mobile'
import { Project } from './project'
import { App } from './app'
import { DeviceLauncher } from './deviceLauncher'
import { getFormatLine, getLogStrNoLevel, getLogType, printLogConSole } from '../utils/logs'

export class LauncherBase {
  currentApp = new App()
  currentMobile = new Mobile()
  runState = 0
  uniAppVueTempAppID = '__UNI__temp__'
  deviceLauncher: DeviceLauncher | null = null
  #project = new Project()
  constructor() {}

  /**
   * 获取运行状态
   */
  getRunningState() {
    return this.runState
  }
  /**
   * 设置运行状态
   */
  setRunningState(state: number) {
    this.runState = state
  }

  /**
   * 设置手机
   */
  setMobile(mobile: Mobile) {
    this.currentMobile = mobile
  }

  /**
   * 获取手机
   */
  getMobile() {
    return this.currentMobile
  }

  async getToolPath(platform: string) {
    if (platform === 'android') {
      return ''
    } else {
      return fileURLToPath(new URL('../../../platform-tools', import.meta.url))
    }
  }

  /**
   * 添加工程
   */
  setCurrentProject(project: Project) {
    this.#project = project
  }

  /**
   * 获取工程
   */
  getCurrentProject() {
    return this.#project
  }

  /**
   * 添加基座
   */
  setCurrentApp(app: App) {
    this.currentApp = app
  }

  /**
   * 获取基座
   */
  getCurrentApp() {
    return this.currentApp
  }

  /**
   * 设置设备启动器
   */
  setDeviceLauncher(deviceLauncher: DeviceLauncher) {
    this.deviceLauncher = deviceLauncher
  }

  /**
   * 获取设备启动器
   */
  getDeviceLauncher() {
    return this.deviceLauncher
  }

  /**
   * 打印消息到运行控制台
   */
  printLogToRunConsole(content: string, type: 'info' | 'error' | 'warn' = 'info') {
    type = getLogType(content)
    content = getLogStrNoLevel(content)
    content = getFormatLine(content)
    printLogConSole(content, type)
  }
}
