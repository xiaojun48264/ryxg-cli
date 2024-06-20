import { promisify } from 'node:util'
import { LauncherBase } from './base'
import { exec, execSync } from 'node:child_process'
import { isBoolean } from 'lodash-es'
import os from 'node:os'
import {
  addPagePathToManifestFile,
  compairVersion,
  compressFilesStream,
  exeCMDAndroid,
  getBaseVersion,
  getFileLastModifyTime,
  getIPAddress,
  getStandardPathByPlatform,
  getUTF8Str,
  getZipEntriesFile,
  isFilterFile,
  parseSpecilXML,
  parseXML2Json,
  readZipFile,
} from '../utils/tools'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { Mobile } from '../utils/mobile'
import { RunConfig } from '@/actions'
import { Project } from './project'
import { App } from './app'
import { getPortPromise } from 'portfinder'
import { WifiServer } from '../service/wifiServer'
import { printLog, runLogs } from '../utils/logs'

let isWin11: boolean
let toolPath = ''
let adbPath = ''

export class AndroidLauncher extends LauncherBase {
  httpPort = '0'
  httpPath = `http://127.0.0.1:${this.httpPort}/static/`
  webSocketPort = 0
  httpProPID = 0
  useLan = false
  basePath = ''
  hasBuildError = false
  wifiServer: WifiServer | null = null
  constructor() {
    super()
  }

  // 获取IP
  getIP() {
    let ip = '127.0.0.1'
    if (this.useLan) {
      ip = getIPAddress()
    }
    return ip
  }

  setHasBuildError(value: boolean) {
    this.hasBuildError = value
  }

  getHasBuildError() {
    return this.hasBuildError
  }

  async restartApp(value: any) {
    await this.stopApp()
    const res = await this.startApp()
    return res
  }

  async startApp() {
    const type = this.currentApp?.type
    if (!!this.currentApp && !!this.currentMobile) {
      try {
        // 建立adb映射
        const startStr = `${this.currentApp.getPackageName()}/${
          type === 'uni-app-x' ? 'io.dcloud.uniapp.UniAppActivity' : 'io.dcloud.PandoraEntry'
        }`
        await exeCMDAndroid(adbPath, '-s', this.currentMobile.udid, 'shell', 'am', 'start', startStr)
      } catch (error) {
        console.error('启动App失败')
        return false
      }
    }

    return true
  }

  /**
   * 安装基座
   */
  async installBase(basePath: string) {
    let result = true
    if (!!this.currentMobile) {
      try {
        await exeCMDAndroid(adbPath, '-s', this.currentMobile.udid, 'install', '-r', '-d', '-t', basePath)
      } catch (error) {
        console.error('安装基座失败')
        result = false
      }
    }

    return result
  }

  /**
   * 查看基座是否已安装
   */
  async isAppExist() {
    if (!!this.currentApp && !!this.currentMobile) {
      const packageName = this.currentApp.getPackageName()
      const tmpValue = await exeCMDAndroid(
        adbPath,
        '-s',
        this.currentMobile.udid,
        'shell',
        'pm',
        'list',
        'packages',
        packageName
      )
      if (tmpValue.includes(packageName)) {
        return true
      }
    }
    return false
  }

  /**
   * 比对基座版本，看是否需要更新
   */
  async isAppNeedUpdate() {
    let versionResult = false
    let timeResult = false

    if (!!this.currentApp && !!this.currentMobile) {
      try {
        const packageName = this.currentApp.getPackageName()
        const tmpValue = await exeCMDAndroid(
          adbPath,
          '-s',
          this.currentMobile.udid,
          'shell',
          'dumpsys',
          'package',
          packageName
        )
        const resultList = tmpValue.split(/[(\r\n)\r\n]+/)
        let hasFirstInstallTime = ''
        for (let lineStr of resultList) {
          const index = lineStr.indexOf('versionName')
          const firstInstallTimeIndex = lineStr.indexOf('firstInstallTime')
          if (firstInstallTimeIndex >= 0) {
            try {
              const startPos = firstInstallTimeIndex + 'firstInstallTime'.length + 1
              const firstInstallTime = lineStr.substring(startPos)
              if (!hasFirstInstallTime) {
                hasFirstInstallTime = firstInstallTime
                const devicesTime = new Date(firstInstallTime || new Date())
                const apkTime = new Date(this.currentApp?.getAppTime() || new Date())
                console.log('devicesTime', devicesTime, 'apkTime', apkTime)
                if (devicesTime < apkTime) {
                  timeResult = true
                }
              }
            } catch (e) {}
          }
          if (index >= 0) {
            const startPos = index + 'versionName'.length + 1
            const currentVersion = lineStr.substring(startPos)
            const baseVersion = this.currentApp.getAppVersion()
            console.log('currentVersion', currentVersion, 'baseVersion', baseVersion)
            if (compairVersion(currentVersion, baseVersion)) {
              versionResult = true
              break
            }
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    return versionResult || timeResult
  }

  /**
   * 卸载基座
   */
  async uninstallBase() {
    if (!!this.currentApp && !!this.currentMobile) {
      const packageName = this.currentApp.getPackageName()
      try {
        await exeCMDAndroid(adbPath, '-s', this.currentMobile.udid, 'uninstall', packageName)
      } catch (error) {
        console.error('卸载基座失败')
        return false
      }
    }
    return true
  }

  /**
   * 运行
   */
  async run(config: RunConfig) {
    this.setRunningState(1)
    this.setMobile(config.mobile)
    this.setDeviceLauncher(config.deviceLauncher)
    if (this.httpPort.toString() === '0') {
      this.getHttpPath()
    }

    // 做Http端口的映射
    const port = parseInt(this.httpPort)
    const httpPortAgent = await this.createPortAgent(port, this.currentMobile!.udid)
    if (!httpPortAgent) {
      this.useLan = true
    }

    const project = new Project()
    const projectType = config.projectNatureId
    if (projectType.includes('UniApp')) {
      project.setType('UniApp')
      project.setCompliePath(config.compilePath)
    }
    project.setAppID(config.appid || '')
    project.setPath(config.projectPath)
    this.setCurrentProject(project)

    const app = new App()

    // 标准基座情况
    if (!config.androidBasePath) {
      config.androidBasePath = getStandardPathByPlatform('android')
      app.setAppID('io.dcloud.HBuilder')
      app.setAppVersion(await getBaseVersion('android_version'))
    } else {
      // 自定义基座情况
      // 有的时候可能不存在Appid
      await this.initCustomBaseAppInfo(
        project.getAppID(),
        app,
        config.androidBasePath,
        project.getPath(),
        project.getType()
      )
      const notSupprt = this.showNotSupprotTips(app)
      if (notSupprt) {
        return false
      }
      await this.showDiffSDKTips(app)
      app.isCustomBase = true
    }
    const lastTime = getFileLastModifyTime(config.androidBasePath)
    app.setAppTime(lastTime)
    app.setName(config.appName)
    this.basePath = config.androidBasePath
    if (!existsSync(this.basePath)) {
      console.error('基座不存在')
      return
    }
    app.setProject(project)
    this.setCurrentApp(app)

    // 先判断基座是否存在

    const exist = await this.isAppExist()
    let isNeedUpdate = true
    if (exist) {
      isNeedUpdate = await this.isAppNeedUpdate()
      if (isNeedUpdate) {
        await this.uninstallBase()
      }
    }
    if (!exist || (exist && isNeedUpdate)) {
      await this.installBase(this.basePath)
    }
    // 先关闭App
    await this.stopApp()
    // 开启WebSocket
    let result = await this.createWifiServer(config.mobile.udid)
    if (!result) {
      console.error('创建代理出错')
      return false
    }
    // 启动基座服务
    result = await this.startBaseServer(config.mobile.udid)
    runLogs(app.getName())
    let needCompressForder = config.compilePath + '/'
    if (project.getType() === 'UniApp') {
      const pagePath = config.pagePath
      const pageQuery = config.pageQuery
      if (pagePath !== '') {
        await this.doRunToPage(project, pagePath, pageQuery)
      }
    }
    // 超时次数
    let timeOut = 0

    const timmer = setInterval(() => {
      // 如果此时关闭了运行，则直接退出
      if (this.getRunningState() === 2) {
        clearInterval(timmer)
      }
      const clientID = this.wifiServer?.getClientInfo()
      console.log('检查客户端是否链接', clientID)
      if (clientID !== '') {
        compressFilesStream(needCompressForder, this.currentApp!.getName())
          .then(packagePath => {
            this.pushResources(packagePath, true)
          })
          .catch(err => {
            console.error(err)
          })
        clearInterval(timmer)
      }
      if (timeOut >= 30) {
        clearInterval(timmer)
        console.error('同步资源失败授权')
        if (this.currentApp!.getIsCustomBase()) {
          console.error('离线基座')
        }
      }
      timeOut++
    }, 1000)

    return result || false
  }

  /**
   * 开启基座服务
   */
  async startBaseServer(udid: string) {
    if (!!this.currentApp) {
      const IP = this.getIP()
      const packageName = this.currentApp.getPackageName()
      const tmpAppInfoStr = packageName + '/' + 'io.dcloud.debug.PullDebugActivity'
      await exeCMDAndroid(
        adbPath,
        '-s',
        udid,
        'shell',
        'am',
        'start',
        '-n',
        tmpAppInfoStr,
        '--es',
        'port',
        this.webSocketPort.toString(),
        '--es',
        'ip',
        IP,
        '--es',
        'appid',
        this.currentApp.getID()
      )
    }
    return false
  }

  /**
   * 杀死App
   */
  async stopApp() {
    if (!!this.currentApp && !!this.currentMobile) {
      try {
        await exeCMDAndroid(
          adbPath,
          '-s',
          this.currentMobile.udid,
          'shell',
          'am',
          'force-stop',
          this.currentApp.getPackageName()
        )
      } catch (error) {
        return false
      }
    }
    return true
  }

  /**
   * 获取手机列表
   */
  async getMobileList(retry = true) {
    let deviceList: Mobile[] = []
    adbPath = await this.getADBPath()
    if (!adbPath) {
      return deviceList
    }

    try {
      const result = await exeCMDAndroid(adbPath, 'devices')
      const resultList = result.split(/[(\r\n)\r\n]+/)
      for (let i of resultList) {
        if (
          i.indexOf('List of devices attached') >= 0 ||
          i == '' ||
          i.indexOf('* daemon not running') >= 0 ||
          i.indexOf('* daemon started successfully') >= 0 ||
          i.indexOf('adb serveris ') >= 0
        ) {
          continue
        }
        if (i.includes('unauthorized')) {
          console.error('设备未授权，请在手机上确认授权')
          continue
        }
        let deviceInfo = i.split('\t')
        let mobile = new Mobile()
        mobile.name = deviceInfo[0]
        mobile.udid = deviceInfo[0]
        mobile.platform = 'android'
        try {
          const brand = await exeCMDAndroid(adbPath, '-s', mobile.udid, 'shell', 'getprop', 'ro.product.brand')
          const model = await exeCMDAndroid(adbPath, '-s', mobile.udid, 'shell', 'getprop', 'ro.product.model')
          mobile.name = `${brand.trim()} ${model.trim()} - ${mobile.udid}`
        } catch (error) {
          console.error(error)
        }

        try {
          let tmpVersion = await exeCMDAndroid(
            adbPath,
            '-s',
            mobile.udid,
            'shell',
            'getprop',
            'ro.build.version.release'
          )
          tmpVersion = tmpVersion.trim()
          mobile.version = tmpVersion
        } catch (error) {
          console.error(error)
          continue
        }
        try {
          let mTmpCpuAbi = await exeCMDAndroid(adbPath, '-s', mobile.udid, 'shell', 'getprop', 'ro.product.cpu.abilist')
          mobile.cpuAbi = mTmpCpuAbi.trim().toLocaleLowerCase().split(',')
        } catch (error) {
          console.error(error)
        }
        deviceList.push(mobile)
      }
      if (retry && deviceList.length === 0) {
        // TODO需要优化，如果设备压根不存在不需要重新查询了。目前策略非手动触发的设备更新都不触发
        await this.terminateADB()
        deviceList = await this.getMobileList(false)
      }
    } catch (error) {
      console.error(error)
    }
    return deviceList
  }

  /**
   * 获取adb路径
   */
  async getADBPath() {
    let _toolPath = await this.getToolPath('android')
    if (!_toolPath) {
      _toolPath = await this.getToolPath('default')
      const isWin32 = os.platform() === 'win32'
      toolPath = path.resolve(_toolPath, isWin32 ? './adb.exe' : './adb')
      if (isWin32) {
        const pid = await this.getRunningAdb()
        if (pid) {
          const tmpPath = await this.getAdbByPid(pid)
          if (tmpPath) {
            toolPath = tmpPath
          }
        }
      }
    }
    if (!existsSync(toolPath)) {
      toolPath = ''
    }
    return toolPath
  }

  /**
   * 获取windows进程里面是否有adb开启
   * 返回pid
   */
  async getRunningAdb() {
    try {
      const { stdout } = await promisify(exec)('cmd /c netstat -ano | findstr 5037', { encoding: 'binary' })
      if (stdout == '') {
        return ''
      } else {
        let result = stdout.trim()
        let mPID = ''
        let resultList = result.replace(/\r\n/g, '\n').split('\n')
        for (let result of resultList) {
          if (result.indexOf('listening') >= 0 || result.indexOf('LISTENING') >= 0) {
            let resultTmpList = result.replace(/\r\n/g, '\n').split(' ')
            mPID = resultTmpList[resultTmpList.length - 1]
            break
          }
        }
        return mPID
      }
    } catch (error) {
      return ''
    }
  }

  /**
   * 根据pid获取adb路径
   */
  async getAdbByPid(pid: string) {
    let path = ''
    const cmdStr = this.isWin11Platform()
      ? 'cmd /c powerShell "Get-Process -id ' + pid + ' | select-object path"'
      : "wmic process where handle='" + pid + "' get executablePath,handle"
    try {
      const { stdout } = await promisify(exec)(cmdStr, { encoding: 'buffer' })
      const result = getUTF8Str(stdout)
      let resultList = result.replace(/\r\n/g, '\n').split('\n')
      for (let line of resultList) {
        let index = line.indexOf('.exe')
        if (index >= 0 && !this.has360(line)) {
          // 获取完整路径(注：路径中可能有空格等存在)
          path = line.substring(0, index + 4)
          break
        }
      }
      return path
    } catch (error) {
      console.error(this.isWin11Platform() ? 'win11 powershell error:' : 'wmic error:' + error)
    }
    return path
  }

  /**
   * TODO win系统下360手机助手会占用5037端口, 这里特定排除。
   */
  has360(line: string) {
    return line.toLocaleLowerCase().includes('360')
  }

  /**
   * 获取系统是否为win11
   */
  isWin11Platform() {
    if (isBoolean(isWin11)) {
      return isWin11
    }
    const release = os.release()
    if (release.startsWith('11')) {
      isWin11 = true
    } else {
      const releaseSplit = release.split('.') || []
      if (parseInt(releaseSplit[releaseSplit.length - 1]) >= 22000) {
        isWin11 = true
      } else {
        isWin11 = false
      }
    }
    return isWin11
  }

  /**
   * 结束ADB
   */
  async terminateADB() {
    // 只杀自己的adb
    const toolPath = await this.getToolPath('default')
    if (os.platform() == 'win32') {
      if (!this.isWin11Platform()) {
        const mCmdStr = `cmd /c powerShell "Get-Process | Where-Object { $_.ProcessName -eq 'adb' -and $_.Path -like '*${toolPath}*' } | Stop-Process"`
        try {
          await promisify(exec)(mCmdStr, { encoding: 'buffer' })
        } catch (e) {}
      } else {
        const mCmdStr = "wmic process where caption='adb.exe' get executablePath,handle"
        let { stdout } = await promisify(exec)(mCmdStr, { encoding: 'buffer' })
        const result = getUTF8Str(stdout)
        let resultList = result.replace(/\r\n/g, '\n').split('\n')
        for (let line of resultList) {
          if (line.indexOf(toolPath) >= 0) {
            let tmpList = line.trim().split(/\s+/) || []
            const port = Number(tmpList[tmpList.length - 1])
            if (port && !isNaN(port)) {
              try {
                await promisify(exec)(`taskkill /F /PID ${port}`, {
                  shell: 'cmd.exe',
                })
              } catch (e) {}
            }
          }
        }
      }
    } else if (os.platform() == 'darwin') {
      const mCmdStr = `ps aux | grep adb | awk '{print $2}'`
      let result = execSync(mCmdStr, { encoding: 'binary' })
      let [mPID] = result.replace(/\r\n/g, '\n').split('\n') || []
      if (mPID) {
        try {
          execSync(`kill -9 ${mPID}`, { encoding: 'binary' })
        } catch (e) {}
      }
    }
    return true
  }

  /**
   * 获取Http服务路径
   */
  getHttpPath() {
    const deviceLauncher = this.getDeviceLauncher()
    let httpPath = ''

    if (!!deviceLauncher) {
      this.httpPort = deviceLauncher.getHttpPort().toString()
      const ip = this.getIP()
      httpPath = `http://${ip}:${this.httpPort}/static/`
      const childProcess = deviceLauncher.getChildProcess()
      let pid = 0
      if (!!childProcess) {
        pid = childProcess.pid
      }
      this.setHttpProPID(pid)
    }
    return httpPath
  }

  setHttpProPID(pid: number) {
    this.httpProPID = pid
  }

  /**
   * 使用ADB建立端口映射
   */
  async createPortAgent(port: number, udid: string) {
    try {
      await exeCMDAndroid(adbPath, '-s', udid, 'reverse', `tcp:${port}`, `tcp:${port}`)
    } catch (error) {
      console.error(error)
      return false
    }
    return true
  }

  /**
   *  设置自定义基座的App信息
   */
  async initCustomBaseAppInfo(appID: string, app: App, packagePath: string, projectPath: string, projectType: string) {
    let innerVersion = ''
    try {
      const data = await parseSpecilXML(packagePath)
      if (!!data) {
        app.setPackageName(data.package)
      }
    } catch (error) {
      printLog('解析AndroidManifest.xml文件失败', 'error')
    }
    // 针对离线打包的apk
    try {
      const dcloudConfigs = readZipFile(packagePath, 'assets/data/dcloud_configs.json')
      if (!!dcloudConfigs) {
        const data = JSON.parse(dcloudConfigs as string)
        if (data && data.iv) {
          innerVersion = data.iv
          app.setInnerVerison(innerVersion)
        }
      }
    } catch (error) {
      printLog('解析dcloud_configs.json文件失败', 'error')
    }
    // 解析dcloud_control.xml
    const dcloudControlXml = readZipFile(packagePath, 'assets/data/dcloud_control.xml')
    if (dcloudControlXml) {
      try {
        const data = await parseXML2Json(dcloudControlXml, 'buffer')
        const obj = data[Object.keys(data)[0]]
        if (!!obj) {
          if (innerVersion === '') {
            innerVersion = obj.version
            app.setInnerVerison(innerVersion)
          }
          // app.setID(obj.apps.app.appid)
          // app.setAppVersion(obj.apps.app.appver)
        }
      } catch (error) {
        printLog('解析dcloud_control.xml文件失败', 'error')
      }
    }

    const manifestJson = getZipEntriesFile(packagePath, 'manifest.json')
    if (manifestJson) {
      try {
        const data = JSON.parse(manifestJson)
        app.setID(data?.id)
        app.setAppVersion(data?.version?.name)
      } catch (e) {
        printLog('解析manifest.json文件失败', 'error')
      }
    }
  }

  /**
   * 建立WifiServer
   */
  async createWifiServer(udid: string) {
    this.webSocketPort = await getPortPromise()
    this.wifiServer = new WifiServer(this.webSocketPort)
    this.wifiServer.initState()
    this.wifiServer.setCurrentLauncher(this)
    if (!!this.currentApp) {
      this.wifiServer.applicationName = this.currentApp.getName()
    }
    if (this.useLan) {
      return true
    } else {
      return this.createPortAgent(this.webSocketPort, udid)
    }
  }

  /**
   * 处理运行到指定页面
   */
  async doRunToPage(project: Project, pagePath: string, pageQuery: string) {
    let mRet = false
    let ID = ''
    if (project.getAppID() === '') {
      ID = this.uniAppVueTempAppID
    }
    const manifestJsonFilePath = path.resolve(project.getCompilePath(), 'manifest.json')
    mRet = await addPagePathToManifestFile(manifestJsonFilePath, pagePath, pageQuery, ID)
  }

  /**
   * 同步全部资源文件
   */
  pushResources(resPath: string, isFirstInstall = false) {
    let result = false
    if (!!this.wifiServer) {
      const currentProject = this.getCurrentProject()
      // 组装同步的数据
      const root: any = {
        mobile: {},
        contents: {
          refreashType: 'reload',
          app: {},
          fileInfo: [],
          project: {},
        },
      }
      if (!!currentProject?.getAppID()) {
        root.contents.project.type = currentProject.getType()
        root.contents.project.appID = currentProject.getAppID()
      }
      const httpPath = this.getHttpPath()
      if (httpPath === '') {
        console.error('获取Http服务失败')
        return false
      }
      root.contents.fileInfo.push({
        action: 'writeFile',
        sourcePath: httpPath + '?' + 'path=' + resPath,
        name: path.basename(resPath),
        fullPackage: true,
        firstInstall: isFirstInstall,
      })
      if (!!this.currentApp) {
        root.contents.app.appID = this.currentApp.getID()
        root.contents.app.customBase = this.currentApp.getIsCustomBase()
      }
      const data = JSON.stringify(root)
      console.log('推送资源')
      this.wifiServer.sendSyncFileMsg(data)
      result = true
    }
    return result
  }

  /**
   * 全量更新
   */
  async isNeedFullUpdate(fileList: string[], compilePath: string) {
    let result = false
    if (compilePath != '' && fileList.length == 0 && !!this.currentApp) {
      result = true
      compressFilesStream(compilePath, this.currentApp.getID())
        .then(packagePath => {
          this.pushResources(packagePath)
        })
        .catch(err => {
          printLog('同步文件失败', 'error')
          console.error(err)
        })
    }
    return result
  }

  /**
   * 同步资源
   */
  async pushResource(fileList: string[] = [], compilePath: string, changType = -1, config: RunConfig) {
    const needFullUpdate = await this.isNeedFullUpdate(fileList, compilePath)
    if (needFullUpdate) {
      return true
    }
    if (!!this.wifiServer) {
      // 组装同步的数据
      const data: any = {
        mobile: {},
        contents: {
          associatePaths: '',
          app: {},
          fileInfo: [],
        },
        project: {},
      }
      const project = this.getCurrentProject()
      if (!!project) {
        data.project.type = project.getType()
        data.project.appID = project.getAppID()
      }
      const httpPath = this.getHttpPath()
      if (httpPath === '') {
        console.error('获取Http服务失败')
        return false
      }
      for (const item of fileList) {
        const fileInfo: any = {
          action: 'writeFile',
        }
        // 如果属于特殊文件，则不需要同步
        if (isFilterFile(item)) {
          continue
        }
        fileInfo.sourcePath = httpPath + '?' + 'path=' + compilePath + '/' + item
        let destPath = item
        if (destPath.lastIndexOf('/') == -1) {
          destPath = '/'
        } else {
          if (!!project) {
            destPath = this.getPushDestPath(item, project)
            if (destPath == '') {
              continue
            }
          }
        }
        fileInfo.path = destPath
        fileInfo.name = path.basename(item)
        fileInfo.fullPackage = false
        data.contents.fileInfo.push(fileInfo)
      }
      // 如果同步列表中没有文件，则直接返回
      if (data.contents.fileInfo.length === 0) {
        return true
      }
      if (!!this.currentApp) {
        data.contents.app.appID = this.currentApp.getID()
        data.contents.app.customBase = this.currentApp.getIsCustomBase()
      }
      data.contents.refreashType = this.getRefreshTypeByFiles(fileList, changType)

      await this.wifiServer.sendSyncFileMsg(JSON.stringify(data))
    }

    return false
  }

  /**
   * 根据文件特殊性，获取刷新类型
   */
  getRefreshTypeByFiles(fileList: string[], changeType = -1) {
    let refreshType = 'reload'
    if (changeType != 1) {
      refreshType = 'current'
    }
    if (fileList[0].endsWith('.dex')) {
      refreshType = 'restart'
      return refreshType
    }
    for (let mItem of fileList) {
      if (mItem == 'manifest.json') {
        refreshType = 'reload'
        break
      }
    }
    return refreshType
  }

  /**
   * 获取要放入到手机里面的相对路径
   */
  getPushDestPath(filePath: string, project: Project) {
    let _path = ''
    const projectPath = project.getPath()
    const compilePath = project.getCompilePath()
    const tmpFileName = path.basename(filePath)
    if (filePath == compilePath + '/' + tmpFileName) {
      _path = '/'
    }
    if (filePath.includes(projectPath) && !filePath.includes(compilePath)) {
      // 如果文件路径包含了工程目录，却不包含编译输出目录的话，则返回空
      _path = ''
    } else {
      // 获取中间路径
      _path = filePath.replace(tmpFileName, '')
    }
    return _path
  }

  /**
   * 显示SDK版本的不同
   */
  async showDiffSDKTips(app: App) {
    const standardSDKVersion = await getBaseVersion('inner_android_sdk_version')
    const oldAppInnerVerion = app.getInnerVersion()
    if (standardSDKVersion !== oldAppInnerVerion) {
      printLog('自定义基座SDK不同', 'error')
    }
  }

  /**
   * 显示不支持自定义基座版本的信息
   */
  showNotSupprotTips(app: App) {
    if (compairVersion(app.getInnerVersion(), '1.9.9.81430') > 0) {
      printLog('当前版本不支持自定义基座', 'error')
      return true
    }
    return false
  }
}
