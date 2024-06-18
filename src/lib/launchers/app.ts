import { Project } from './project'

export class App {
  appID = '' // manifest.json uni-app的id
  ID = 'HBuilder' // 安卓的appid
  appVersion = '' // 应用版本号
  innserVersion = '' // 基座版本号
  appTime = '' // app的生成时间
  packageName = 'io.dcloud.HBuilder' //
  name = '' //应用名称
  isCustomBase = false
  uniAppX = false
  type = 'uni-app'
  project = new Project()
  constructor() {}
  setName(name: string) {
    this.name = name
  }
  setType(type: string) {
    this.type = type
  }
  setUniAppX(isX: boolean) {
    this.uniAppX = isX
  }
  getUniAppX() {
    return this.uniAppX
  }
  getName() {
    return this.name
  }
  setPackageName(value: string) {
    this.packageName = value
  }
  getPackageName() {
    return this.packageName
  }
  setInnerVerison(value: string) {
    this.innserVersion = value
  }
  getInnerVersion() {
    return this.innserVersion
  }
  getIsCustomBase() {
    return this.isCustomBase
  }
  setAppVersion(value: string) {
    this.appVersion = value
  }
  getAppVersion() {
    return this.appVersion
  }
  setAppTime(value: string) {
    this.appTime = value
  }
  getAppTime() {
    return this.appTime
  }
  getAppID() {
    return this.appID
  }
  setAppID(appID: string) {
    this.appID = appID
  }
  getID() {
    return this.ID
  }
  setID(ID: string) {
    this.ID = ID
  }
  setProject(project: Project) {
    this.project = project
  }
  getProject() {
    return this.project
  }
  getProjectOutPutDir() {
    let dir = ''
    if (this.project) {
      dir = this.project.getCompilePath()
      if (!dir.endsWith('/')) {
        dir = dir + '/'
      }
    }
    return dir
  }
}
