import { Command } from 'commander'

export function getRemainingFlags(cli: Command) {
  const rawArgs = [...cli.args]
  return rawArgs
    .splice(
      Math.max(
        rawArgs.findIndex((item: string) => item.startsWith('--')),
        0
      )
    )
    .filter((item: string, index: number, array: string[]) => {
      // 如果该选项被command.js使用，那么我们跳过它
      if (cli.options.find((o: any) => o.short === item || o.long === item)) {
        return false
      }

      // 如果它是command.js使用的选项的参数，那么我们
      // 也跳过它
      const prevKeyRaw = array[index - 1]
      if (prevKeyRaw) {
        const previousKey = camelCase(prevKeyRaw.replace(/--/g, '').replace('no', ''))
        if (cli.getOptionValue(previousKey) === item) {
          return false
        }
      }

      return true
    })
}

/**
 * Camel-case the given `flag`
 *
 * @param {String} flag
 * @return {String}
 * @api private
 */

function camelCase(flag: string) {
  return flag.split('-').reduce((str, word) => {
    return str + word[0].toUpperCase() + word.slice(1)
  })
}
