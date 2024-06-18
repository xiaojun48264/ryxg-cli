import chalk from 'chalk'

export const ERROR_PREFIX = chalk.bgRgb(210, 0, 75).bold.rgb(0, 0, 0)(' Error ')
export const INFO_PREFIX = chalk.bgRgb(134, 144, 156).bold.rgb(0, 0, 0)(' Info ')
export const WARN_PREFIX = chalk.bgRgb(255, 200, 0).bold.rgb(0, 0, 0)(' Warn ')
export const SUCCESS_PREFIX = chalk.bgRgb(0, 200, 100).bold.rgb(0, 0, 0)(' Success ')
