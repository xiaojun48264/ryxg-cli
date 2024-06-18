import { execFile, exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import iconvLite from 'iconv-lite'
import { isString } from 'lodash-es'
import { createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import hjson from 'hjson'
import { networkInterfaces, tmpdir, platform } from 'node:os'
import { fileURLToPath, URL } from 'node:url'
import dayjs from 'dayjs'
import archiver from 'archiver'
import { getPidByProcessName, printLog } from './logs'
import treeKill from 'tree-kill'
import { Project } from '../launchers/project'
import { debounce } from "lodash-es";
import { RunConfig } from '@/actions'

export async function exeCMDAndroid(adbPath: string, ...cmdStr: string[]) {
  try {
    const { stdout }: { stdout: Buffer } = await promisify(execFile)(adbPath, [...cmdStr], { encoding: 'buffer' })
    return Promise.resolve(getUTF8Str(stdout))
  } catch (error) {
    return Promise.reject(error)
  }
}

export async function exeCMD(cmd: string) {
  try {
    const { stdout } = await promisify(exec)(cmd, { encoding: 'buffer' })
    return Promise.resolve(getUTF8Str(stdout))
  } catch (error) {
    return Promise.reject(error)
  }
}

export async function exeCMDMdb(cmd: string, reqFilePath: string, cancelFile: string) {
  try {
    const isCancelFile = isString(cancelFile) && cancelFile !== ''
    const args = ['-req', reqFilePath]
    if (isCancelFile) {
      args.push('-cancelToken')
      args.push(cancelFile)
    }
    const { stdout, stderr } = await promisify(execFile)(cmd, args, { encoding: 'buffer' })

    if (stdout || !stderr) {
      if (isCancelFile) {
        return Promise.resolve(stdout)
      } else {
        return Promise.resolve(getUTF8Str(stdout))
      }
    }
    return Promise.resolve('[]')
  } catch (error) {
    return Promise.reject(error)
  }
}

export function getUTF8Str(binary: Buffer) {
  return iconvLite.decode(binary, 'utf-8')
}

export function getCP936Str(binary: Buffer) {
  return iconvLite.decode(binary, 'cp936')
}

/**
 * 对比版本
 * @param cuurentVersion 当前版本
 * @param baseVersion 基础版本
 */
export function compairVersion(cuurentVersion: string, baseVersion: string) {
  // 补位0，或者使用其它字符
  const ZERO_STR = '000000000000000000000000000000000000000000'
  if (cuurentVersion === baseVersion) {
    return 0
  }
  let len1 = cuurentVersion ? cuurentVersion.length : 0
  let len2 = baseVersion ? baseVersion.length : 0
  if (len1 === 0 && len2 === 0) {
    return 0
  }
  if (len1 === 0) {
    return 1
  }
  if (len2 === 0) {
    return -1
  }
  const arr1 = cuurentVersion.split('.')
  const arr2 = baseVersion.split('.')
  const length = Math.min(arr1.length, arr2.length)
  for (let i = 0; i < length; i++) {
    let a = arr1[i]
    let b = arr2[i]
    if (a.length < b.length) {
      a = ZERO_STR.substring(0, b.length - a.length) + a
    } else if (a.length > b.length) {
      b = ZERO_STR.substring(0, a.length - b.length) + b
    }
    if (a < b) {
      return 1
    } else if (a > b) {
      return -1
    }
  }
  if (arr1.length < arr2.length) {
    return 1
  } else if (arr1.length > arr2.length) {
    return -1
  }
  return 0
}

/**
 * 判断是否为cli项目
 */
export function isCliProject(projectPath: string) {
  const manifestPath = path.join(projectPath, './src/manifest.json')
  const isExist = existsSync(manifestPath)
  return isExist
}

/**
 * 获取manifest.json
 */
export async function getManifest(projectPath: string) {
  const manifestPath = path.join(projectPath, isCliProject(projectPath) ? 'src/manifest.json' : 'manifest.json')
  const isExist = existsSync(manifestPath)
  if (isExist) {
    const manifest = hjson.parse(await readFile(manifestPath, 'utf-8'))
    return manifest
  }
  return {}
}

/**
 * 获取解包路径
 */
export function getUnpackagePath(isCli: boolean, projectPath: string) {
  let unpackageForderName = 'unpackage'
  if (isCli) {
    unpackageForderName = 'dist'
  }
  const UnpackageForder = path.resolve(projectPath, unpackageForderName)
  if (!existsSync(UnpackageForder)) {
    mkdirSync(UnpackageForder, { recursive: true })
  }
  return UnpackageForder
}

/**
 * 获取IP信息
 */
export function getIPAddress() {
  let address = ''
  const netObj = networkInterfaces()
  for (let key in netObj) {
    const value = netObj[key] as any[]
    for (let i = 0; i < value.length; i++) {
      let { family, address, internal } = value[i]
      if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
        address = address
        break
      }
    }
    if (address != '') {
      break
    }
  }
  return address
}

export function getInsByPlatform(platform: string) {
  const enumIns: Record<string, string> = {
    android: `.roid.ins`,
  }
  return enumIns[platform]
}

export function getStandardPathByPlatform(platform: string) {
  const baseNameEnmu: Record<string, string> = {
    android: `android_base.apk`,
  }
  return fileURLToPath(new URL(`../../../base/${baseNameEnmu[platform]}`, import.meta.url))
}
export function getCustomPathByPlatform(projectPath: string, isCli: boolean, platform: string) {
  const baseNameEnmu: Record<string, string> = {
    android: `android_debug.apk`,
  }
  let mUnpackagePath = getUnpackagePath(isCli, projectPath)
  let mBasePath = path.resolve(mUnpackagePath, 'debug', baseNameEnmu[platform])
  return mBasePath
}

/**
 * 查找版本号信息
 */
export async function getBaseVersion(key: string) {
  // 定位到版本号文件位置
  const versionFile = fileURLToPath(new URL('../../../base/version.txt', import.meta.url))
  if (existsSync(versionFile)) {
    let contents = await readFile(versionFile, { encoding: 'utf-8' })
    let resultList = contents.split(/[(\r\n)\r\n]+/)
    for (let line of resultList) {
      const [v, k] = line.split('=')
      if (v === key) {
        return k
      }
    }
  }
  return '0.0.0'
}

export function getFileLastModifyTime(filePath: string) {
  if (existsSync(filePath)) {
    const state = statSync(filePath)
    return dayjs(state.mtime).format('YYYY-MM-DD HH:mm:ss')
  }
  return ''
}

export function sleep(time: number) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

/**
 * 写入内容到临时文件
 * 返回文件全路径
 */
export function writeStringToTmpFile(value: string, suffix: string, fileName: string) {
  let tmpDir = tmpdir().replace(/\\/g, '/')
  tmpDir = tmpDir + '/ry-cli/launcher'
  if (existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true })
  }
  let filePath = `${tmpDir}/${new Date().getTime()}${suffix}`
  if (fileName !== '') {
    filePath = fileName
  }
  try {
    writeFileSync(filePath, value, { flag: 'w+' })
  } catch (error) {
    console.error('写入文件失败', error)
  }
  return filePath
}

export async function addPagePathToManifestFile(filePath: string, pagePath: string, pageQuery: string, id: string) {
  let result = false

  if (existsSync(filePath)) {
    const content = await readFile(filePath, 'utf-8')
    try {
      const value = JSON.parse(content)
      if (!!value) {
        if (id !== '') {
          value.id = id
        }
        value.arguments = {
          pageName: pagePath,
          query: pageQuery,
        }
        writeStringToTmpFile(JSON.stringify(value), '', filePath)
        result = true
      }
    } catch (error) {}
  }

  return result
}

/**
 * 获取临时压缩的文件路径
 */
export function getTemZipPath(projectName: string) {
  let tmpDir = tmpdir().replace(/\\/g, '/')
  tmpDir = tmpDir + '/ry-cli/runTmp/' + projectName
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true })
  }
  return tmpDir
}

/**
 * 压缩文件到指定目录，并返回压缩后的地址（压缩前会先删除原文件）--流压缩
 */
export function compressFilesStream(sourcePath: string, projectName: string, suffix: string = '.zip'): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const tmpDir = getTemZipPath(projectName)
      const tmpPath = path.resolve(tmpDir, projectName + suffix)
      const output = createWriteStream(tmpPath)
      const archive = archiver('zip', { zlib: { level: 5 } })
      output.on('close', () => {
        resolve(tmpPath)
      })
      archive.on('warning', err => {
        if (err.code !== 'ENOENT') {
          throw err
        }
      })
      archive.on('error', err => {
        throw err
      })
      archive.pipe(output)
      archive.directory(sourcePath, false)
      archive.finalize()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 编译项目
 */
export function compileProject(config: RunConfig): Promise<boolean> {

  const handleUpdate = debounce(() => {
    config.deviceLauncher.pushResources(config)
  }, 500)

  return new Promise(resolve => {
    let isRefersh = false
    const oldPids = getPidByProcessName(['node.exe'])
    let diffPids: number[] = []
    const processID = spawn('npm', ['run', 'dev:app'], {
      shell: platform() === 'win32' ? true : false,
      cwd: config.projectPath,
    })
    processID.stdout.on('data', data => {
      if (diffPids.length === 0) {
        const newPids = getPidByProcessName(['node.exe'])
        diffPids = newPids.filter(pid => !oldPids.includes(pid))
      }
      data = getUTF8Str(data)
      printLog(data, 'info')
      if (data.includes('DONE  Build complete.')) {
        if (!isRefersh) {
          resolve(true)
          isRefersh = true
        } else {
          printLog('热更新', 'success')
          handleUpdate()
        }
      }
    })
    processID.stderr.on('data', data => {
      data = getCP936Str(data)
      printLog(data, 'error')
    })
    processID.on('close', code => {
      if (code !== 0) {
        resolve(false)
      }
    })
    processID.on('error', err => {
      !!err.message && printLog(err.message, 'error')
      resolve(false)
    })
    process.on('exit', () => {
      diffPids.forEach(pid => {
        treeKill(pid)
      })
    })
  })
}

/**
 * 是否属于被项目过滤的文件
 */
export function isFilterFile(filePath: string) {
  let result = false
  if (
    filePath.includes('/.svn/') ||
    filePath.includes('\\.svn\\') ||
    filePath.includes('/.git/') ||
    filePath.includes('\\.git\\') ||
    filePath.includes('/.settings/') ||
    filePath.includes('\\.settings\\') ||
    filePath.includes('/.project') ||
    filePath.includes('\\.project')
  ) {
    result = true
  }
  return result
}

/**
 * 过滤不需要同步资源的文件
 */
export function isFilterFiles(projectPath: string, filePath: string, isSingle: boolean) {
  let result = false
  // 可能需要过滤unpackageFiles
  let fileRelativPath = path.relative(projectPath, filePath)
  if (!existsSync(filePath)) {
    return true
  }
  let mStat = statSync(filePath)
  let mIsDir = mStat.isDirectory()
  if (
    fileRelativPath.startsWith('unpackage/') ||
    fileRelativPath.startsWith('node_modules/') ||
    (mIsDir && (fileRelativPath.startsWith('unpackage/') || fileRelativPath == 'node_modules'))
  ) {
    result = true
    return result
  }
  let project = new Project()
  let providers = project.getUniCloudProviders()
  for (let mItem of providers) {
    let mUniCloudPath = project.getUnicloudRoot(mItem)
    if (fileRelativPath.startsWith(mUniCloudPath)) {
      return true
    }
  }
  let fileName = path.basename(filePath)
  if (isSingle) {
    if (
      fileName == '.svn' ||
      fileName == '.git' ||
      fileName == '.settings' ||
      fileName == '.project' ||
      fileName == '.DS_Store' ||
      fileName.endsWith('.nvue') ||
      fileName.endsWith('.less') ||
      fileName.endsWith('.sass') ||
      fileName.endsWith('.scss') ||
      fileName.endsWith('.nview') ||
      fileName.endsWith('.map')
    ) {
      return true
    }
  } else {
    if (
      fileName == '.svn' ||
      fileName == '.git' ||
      fileName == '.settings' ||
      fileName == '.project' ||
      fileName == '.DS_Store'
    ) {
      return true
    }
  }
  return result
}
