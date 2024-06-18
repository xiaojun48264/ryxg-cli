import { exec, execSync, spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { platform, tmpdir } from 'node:os'
import { ERROR_PREFIX, INFO_PREFIX, SUCCESS_PREFIX, WARN_PREFIX } from '../ui/prefixes'
import dayjs from 'dayjs'
import path from 'node:path'
import treeKill from 'tree-kill'
import { getUTF8Str } from './tools'

const LogsDir = `${tmpdir().replace(/\\/g, '/')}/ry-cli/logs`
const LogsFilePath = path.resolve(LogsDir, 'logs.log')

const PREFIX = {
  ERROR: ERROR_PREFIX,
  INFO: INFO_PREFIX,
  WARN: WARN_PREFIX,
  SUCCESS: SUCCESS_PREFIX,
}

type LogType = 'info' | 'error' | 'warn' | 'success'

/**
 * 检查日志文件是否存在
 */
export function checkLogs() {
  if (!existsSync(LogsDir)) {
    mkdirSync(LogsDir, { recursive: true })
  }
}

/**
 * 运行日志
 */
export function runLogs() {
  clearLogs()
  const _platform = platform()
  let command = ''
  let args: string[] = []

  switch (_platform) {
    case 'win32':
      command = 'cmd.exe'
      args = [
        '/c',
        'start',
        'cmd.exe',
        '/k',
        `powershell.exe -NoExit -Command "Get-Content -Path '${LogsFilePath}' -Wait -Encoding UTF8"`,
      ]
      break

    case 'darwin':
      command = 'osascript'
      args = ['-e', `tell application "Terminal" to do script "tail -f ${LogsFilePath}"`]
      break

    case 'linux':
      command = 'xterm'
      args = ['-e', `tail -f ${LogsFilePath}`]
      break

    default:
      break
  }
  if (!!command) {
    const oldPids = getPidByProcessName(['cmd.exe', 'powershell.exe'])
    spawn(command, args, { shell: _platform === 'win32' ? true : false })
    let diffPids: number[] = []
    setTimeout(() => {
      const newPids = getPidByProcessName(['cmd.exe', 'powershell.exe'])
      diffPids = newPids.filter(pid => !oldPids.includes(pid))
    }, 1000)

    process.on('exit', () => {
      diffPids.forEach(pid => {
        treeKill(pid)
      })
    })
    process.on('SIGINT', () => {
      diffPids.forEach(pid => {
        treeKill(pid)
      })
      process.exit(1)
    })
    process.on('SIGTERM', () => {
      diffPids.forEach(pid => {
        treeKill(pid)
      })
      process.exit(1)
    })
  }
}

/**
 * 通过进程名获取pid
 */
export function getPidByProcessName(names: string[]) {
  const tasklist = execSync('tasklist /fo csv /nh')
  const pids: number[] = []
  const lines = getUTF8Str(tasklist).split('\r\n')
  for (let line of lines) {
    const cols = line.split('","')
    if (cols.length >= 2) {
      const name = cols[0].replace('"', '')
      const pid = cols[1].replace('"', '')
      if (names.includes(name)) {
        pids.push(parseInt(pid))
      }
    }
  }
  return pids
}

/**
 * 清空日志
 */
export function clearLogs() {
  checkLogs()
  writeFileSync(LogsFilePath, '', 'utf-8')
}

/**
 * 格式化日志
 */
export function formatLog(data: string, type: LogType) {
  const logType = type.toUpperCase() as 'ERROR' | 'INFO' | 'WARN' | 'SUCCESS'
  const prefix = PREFIX[logType]
  const time = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return `${prefix} ${time} ${data}`
}

/**
 * 输出日志到控制台
 */
export function printLogConSole(data: string, type: LogType) {
  const logStream = createWriteStream(LogsFilePath, { flags: 'a' })
  logStream.write(`${formatLog(data, type)}\n`)
}

/**
 * 打印日志
 */
export function printLog(data: string, type: LogType) {
  console.log(`\n${formatLog(data, type)}`)
}

/**
 * 去掉日志类型
 */
export function getLogStrNoLevel(contents: any) {
  if (typeof contents !== 'string') {
    return JSON.stringify(contents)
  }
  let result = contents
  const typeArray = ['[ERROR] :', '[LOG] :', '[INFO] :', '[WARN] :']
  for (let item of typeArray) {
    if (contents.startsWith(item)) {
      result = contents.replace(item, '')
      break
    }
  }
  return result
}

/**
 * 获取日志类型
 */
export function getLogType(logStr: string) {
  let type: 'info' | 'error' | 'warn' = 'info'
  if (logStr.startsWith('[ERROR] :')) {
    type = 'error'
  } else if (logStr.startsWith('[WARN] :')) {
    type = 'warn'
  }
  return type
}

const ReplaceInfos = new Map()

/**
 * 格式化line
 */
export function getFormatLine(line: string) {
  let result = line
  if (ReplaceInfos.size === 0) {
    ReplaceInfos.set(
      '---BEGIN:JSON---',
      createReplaceInfo('Object', '---BEGIN:JSON---', '', '---END:JSON---', false, false)
    )
    ReplaceInfos.set(
      '---BEGIN:CONSOLE---',
      createReplaceInfo('CONSOLE', '---BEGIN:CONSOLE---', '', '---END:CONSOLE---', false, false)
    )
    ReplaceInfos.set(
      '---BEGIN:NUMBER---',
      createReplaceInfo('Number', '---BEGIN:NUMBER---', '', '---END:NUMBER---', false, true)
    )
    ReplaceInfos.set(
      '---BEGIN:EXCEPTION---',
      createReplaceInfo('EXCEPTION', '---BEGIN:EXCEPTION---', '', '---END:EXCEPTION---', false, true)
    )
    ReplaceInfos.set(
      '---BEGIN:BOOLEAN---',
      createReplaceInfo('Boolean', '---BEGIN:BOOLEAN---', '', '---END:BOOLEAN---', false, true)
    )
    ReplaceInfos.set('---NULL---', createReplaceInfo('', '---NULL---', 'null', '', true, true))
    ReplaceInfos.set('---UNDEFINED---', createReplaceInfo('', '---UNDEFINED---', 'undefined', '', true, true))
    ReplaceInfos.set('---COMMA---', createReplaceInfo('', '---COMMA---', ', ', '', true, true))
    ReplaceInfos.set(
      '---BEGIN:CLASS---',
      createReplaceInfo('Class', '---BEGIN:CLASS---', '', '---END:CLASS---', false, true)
    )
  }

  ReplaceInfos.forEach(function (value, key) {
    let mIndex = result.indexOf(key)
    if (mIndex >= 0) {
      const { startPrefix, endPrefix, type, replaceContent } = value

      let typeStr = '[' + type + ']'
      if (type == '') {
        typeStr = replaceContent
      }
      let tmpLine = result.replace(new RegExp(startPrefix, 'g'), typeStr + ' ')
      if (endPrefix != '') {
        tmpLine = tmpLine.replace(new RegExp(endPrefix, 'g'), ' ')
      }
      result = tmpLine
    }
  })
  result = result.trim()
  return result
}

export function createReplaceInfo(
  type: string,
  startPrefix: string,
  replaceContent: string,
  endPrefix: string,
  isReplace: boolean = false,
  isStype: boolean = false
) {
  return {
    startPrefix: startPrefix || '',
    endPrefix: endPrefix || '',
    replaceContent: replaceContent || '',
    type: type || '',
    isReplace: isReplace,
    isStype: isStype,
  }
}
