import WebSocket, { WebSocketServer } from 'ws'
import { AndroidLauncher } from '../launchers/android'
import { sleep } from '../utils/tools'

export class WifiServer {
  server: WebSocketServer | null = null
  connect: WebSocket.WebSocket | null = null
  clientID = ''
  applicationName = ''
  unsent_msgs: string[] = []
  launcher: AndroidLauncher | null = null
  port: number = 0
  timers: NodeJS.Timeout | null = null
  constructor(port: number) {
    this.port = port
  }

  initState() {
    try {
      this.server = new WebSocketServer({ port: this.port })
      this.server.on('connection', (connect, request) => {
        if (request.headers['x-checkserver-header']) {
          connect.close()
          return
        }
        this.connect = connect
        const value = this.mergeUnSentMsg()
        if (value) {
        }
        this.connect.on('message', msg => {
          if (msg == undefined || msg == null) {
            return
          }
          const recived = JSON.parse(msg.toString())
          if (recived) {
            if (this.getClientInfo() === '') {
              this.saveClientInfo(recived)
            } else if (recived.contents?.logStr) {
              this.printLog(recived.contents?.logStr)
            } else {
              if (recived.returnValue && recived.returnValue.str) {
                this.printLog(recived.returnValue.str)
              }
            }
          }
        })
      })
      this.server.on('listening', () => {
        console.log('Wifi服务器监听', this.port)
      })
      this.checkServer()
    } catch (error) {
      console.error(error)
    }
  }

  checkServer() {
    this.timers = setInterval(() => {
      const client = new WebSocket(`ws://localhost:${this.port}/test`, {
        headers: {
          'x-checkserver-header': 'true',
        },
      })
      client.on('error', () => {
        console.error('Wifi服务器没有运行。重新启动...')
        this.initState()
      })
    }, 1000 * 20)
  }

  unCheckServer() {
    if (this.timers) {
      clearInterval(this.timers)
    }
  }

  mergeUnSentMsg() {
    const getRefreashType = (level: string, currentLevel: string) => {
      const refreashTypeLevel: Record<string, number> = {
        restart: 3,
        reload: 2,
        current: 1,
      }
      const levelValue = refreashTypeLevel[level] || 0
      const currentLevelValue = refreashTypeLevel[currentLevel] || 0
      return levelValue > currentLevelValue ? level : currentLevel
    }
    const refreashTypeDebug = 'debug'
    if (this.unsent_msgs.length <= 0) {
      return
    }
    let unsentMsg: any = null
    let debug = null
    if (this.unsent_msgs.length === 1) {
      unsentMsg = JSON.parse(this.unsent_msgs[0])
    } else {
      this.unsent_msgs.forEach(msg => {
        try {
          const msgParse = JSON.parse(msg)
          const refreashType = msgParse?.contents?.refreashType
          if (refreashType === refreashTypeDebug) {
            // debug的只发送最后一次的
            debug = msgParse
          } else {
            if (!unsentMsg) {
              // 第一次非debug直接赋值
              unsentMsg = msgParse
            } else {
              // 赋值后是对fileInfo合refreashType替换
              msgParse.contents?.fileInfo?.forEach((item: any) => {
                const fullPackage = item?.fullPackage
                if (fullPackage) {
                  // 如果有全量包的数据，重置之前的数据
                  unsentMsg.contents.fileInfo = []
                  unsentMsg.contents.refreashType = refreashType
                }
                unsentMsg.contents.fileInfo.push(item)
              })

              unsentMsg.contents.refreashType = getRefreashType(refreashType, unsentMsg.contents?.refreashType)
            }
          }
        } catch (e) {
          console.error(e)
        }
      })
    }
    this.unsent_msgs = []
    return { debug, unsentMsg }
  }

  /**
   * 发送同步文件消息
   */
  async sendSyncFileMsg(value: string) {
    if (this.connect && this.connect.readyState === this.connect.OPEN) {
      if (this.clientID !== '') {
        this.connect.send(value)
      }
      return true
    } else {
      this.unsent_msgs.push(value)
      await sleep(1000)
      if (!this.connect || this.connect?.readyState !== this.connect?.OPEN) {
        const msg = '同步资源程序完成'
        const uuid = this.launcher?.currentMobile?.udid
        if (uuid) {
          this.launcher?.restartApp({ uuid, msg })
        }
      }
    }
  }

  /**
   * 保存客户端信息
   */
  saveClientInfo(value: any) {
    let clientID = value.mobile.clientID
    if (!!clientID) {
      this.clientID = clientID
    }
  }

  getClientInfo() {
    return this.clientID
  }

  setCurrentLauncher(launcher: AndroidLauncher) {
    this.launcher = launcher
  }

  /**
   * 打印客户端发送来的消息
   */
  printLog(value: string, level?: string) {
    if (this.launcher) {
      if (value == 'application_Started') {
        let bHasBuildError = false
        if (this.launcher instanceof AndroidLauncher) {
          bHasBuildError = this.launcher.getHasBuildError()
        }
        if (bHasBuildError) {
          value = `运行项目有生成错误：${this.applicationName}`
        } else {
          value = this.getSpecialLogStr(value)
        }
        level = 'error'
      } else {
        value = this.getSpecialLogStr(value)
      }
      if (value) {
        this.launcher.printLogToRunConsole(value, (level as any) || 'error')
      }
    }
  }

  /**
   * 特殊日志处理
   */
  getSpecialLogStr(value: string) {
    if (value == 'application_Started') {
      value = `应用启动`
    } else if (value == 'HX_Device_Log_SyncResource_Completed') {
      value = `同步资源完成`
    } else if (value == 'HX_Device_Log_StandarBase_Starting') {
      value = `标准基座启动`
    } else if (value == 'HX_Device_Log_CustomBase_Starting' || value == 'HX_Device_Log_customBase_Starting') {
      value = `自定义基座启动`
    } else if (value == 'HX_Device_Log_CustomBase_Need_HX_Process') {
      new Promise(r => {
        // 基座哪里要等200ms在拉基座
        setTimeout(r, 210)
      }).then(() => {
        console.log('拉取基座');
        this.launcher?.restartApp?.({ msg: true })
      })
      value = ''
    } else if (value == '重启成功') {
      value = ''
    }
    return value
  }

  /**
   * 关闭服务
   */
  async closeConnection() {
    this.unCheckServer()
    this.server?.close(() => {
      console.log('Wifi服务器关闭')
    })
  }

  /**
   * 获取应用名称
   */
  getApplicationName() {
    return this.launcher?.getCurrentApp()?.getName() || ''
  }
}
