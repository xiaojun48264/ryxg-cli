import { RunConfig } from '@/actions'
import { spawn } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { getPortPromise } from 'portfinder'
import { createLauncher } from '.'
import { AndroidLauncher } from './android'
import path from 'node:path'
import { isFilterFiles } from '../utils/tools'

export class DeviceLauncher {
  #childProcess: any
  #isStartHttpServer = false
  #launcher: AndroidLauncher | null = null
  #httpPort = 0
  constructor() {}

  /**
   * 先启动Http服务
   */
  async startHttpServer(port: string) {
    const processId = process.env.HBuilderProcessId || ''
    const serverPath = fileURLToPath(new URL('../../../service/httpServer.mjs', import.meta.url))
    this.#childProcess = spawn('node', [serverPath, port, processId], {
      stdio: [process.stdin, process.stdout, process.stderr],
    })
    process.on('exit', () => {
      this.#childProcess?.kill()
    })
  }

  /**
   * 创建Http的端口代理
   */
  createHttpPortAgent() {
    this.#isStartHttpServer = true
  }

  /**
   * 运行
   */
  async runDevice(config: RunConfig) {
    const { platform } = config
    if (platform === 'android') {
      this.#httpPort = await getPortPromise()
      if (!this.#isStartHttpServer) {
        this.startHttpServer(this.#httpPort.toString())
      }
      this.#launcher = createLauncher(platform as string)!
      await this.#launcher.run(config)
    }
  }

  /**
   * 过滤特殊文件的刷新
   */
  filterSpecialFile(files: string[] = [], projectPath: string = '') {
    let _files = []
    if (!!projectPath && !!this.#launcher) {
      const app = this.#launcher.getCurrentApp()
      if (!!app) {
        let project = app.getProject()
        if (!!project) {
          projectPath = project.getPath()
        }
      }
    }
    if (!!projectPath) {
      return files
    }
    for (let item of files) {
      let tmpFilePath = path.resolve(projectPath, item)
      if (item.startsWith(projectPath)) {
        tmpFilePath = item
      }
      let filter = isFilterFiles(projectPath, tmpFilePath, true)
      if (!filter) {
        _files.push(item)
      }
    }
    return _files
  }

  /**
   * 推送资源
   */
  pushResources(config: RunConfig) {
    const compilePath = config.compilePath
    const changeFiles = this.filterSpecialFile([], config.compilePath)
    if (!!changeFiles && this.#launcher) {
      // 判断当前是否在运行中
      if (this.#launcher.getRunningState() === 1) {
        this.#launcher.pushResource(changeFiles, compilePath, -1, config)
      }
    }
  }

  /**
   * 停止运行
   */
  async stopRun(config: RunConfig) {}

  async getRemoteDebugUrl() {}

  async restartApp() {}

  async weexDebug() {}

  async installPackage() {}

  getHttpPort() {
    return this.#httpPort
  }

  getChildProcess() {
    return this.#childProcess
  }

  getIsStartHttpServer() {
    return this.#isStartHttpServer
  }

  /**
   * 释放http node进程
   */
  killNode() {}

  /**
   * 返回当前的launcher
   */
  getLauncher() {
    return this.#launcher
  }
}
