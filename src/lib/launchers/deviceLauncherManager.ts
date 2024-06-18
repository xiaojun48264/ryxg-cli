import { DeviceLauncher } from "./deviceLauncher"

export class DeviceLauncherManager {
  private static instance: DeviceLauncherManager
  #launcherMap = new Map<string, DeviceLauncher>()

  private constructor() {}

  public static getInstance(): DeviceLauncherManager {
    if (!DeviceLauncherManager.instance) {
      DeviceLauncherManager.instance = new DeviceLauncherManager()
    }    
    return DeviceLauncherManager.instance
  }

  addLauncher(udid: string, launcher: DeviceLauncher) {
    this.#launcherMap.set(udid, launcher)
  }

  getLauncherByUDID(udid: string) {
    return this.#launcherMap.get(udid)
  }

  getLauncherByUDIDEx(udid: string) {
    let launcher = this.getLauncherByUDID(udid)
    if (!launcher) {
      launcher = new DeviceLauncher()
      this.addLauncher(udid, launcher)
    }
    return launcher
  }

  removeLauncher(udid: string) {
    this.#launcherMap.delete(udid)
  }
}
