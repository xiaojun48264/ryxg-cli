import { AndroidLauncher } from './android'

export function createLauncher(platform: string) {
  let launcher: AndroidLauncher | null = null
  switch (platform) {
    case 'android':
      launcher = new AndroidLauncher()
      break

    default:
      break
  }
  return launcher
}
