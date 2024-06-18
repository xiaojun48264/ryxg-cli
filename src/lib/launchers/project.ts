const NATURE_UNIAPP = 'UniApp'
const NATURE_UNIAPP_VUE = 'UniApp_Vue'

export class Project {
  #appID: string = ''
  #name: string = ''
  #type: string = ''
  #compilePath: string = ''
  #path: string = ''
  constructor() {}

  hasNature(value: string): boolean {
    return this.#type.includes(value)
  }

  isUniApp() {
    return this.hasNature(NATURE_UNIAPP)
  }
  isUniAppVue() {
    return this.hasNature(NATURE_UNIAPP_VUE)
  }
  setCompliePath(path: string) {
    this.#compilePath = path
  }
  getCompilePath() {
    return this.#compilePath
  }
  getUniCloudProviders() {
    return ['aliyun', 'tcb']
  }
  getUnicloudRoot(provider: string) {
    return 'uniCloud-' + provider
  }
  setPath(path: string) {
    this.#path = path
  }
  getPath() {
    return this.#path
  }
  setAppID(id: string) {
    this.#appID = id
  }
  getAppID() {
    return this.#appID
  }
  setName(name: string) {
    this.#name = name
  }
  getName() {
    return this.#name
  }
  setType(type: string) {
    this.#type = type
  }
  getType() {
    return this.#type
  }
}
