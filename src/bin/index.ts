#!/usr/bin/env node
import { Command } from 'commander'
import { loadLocalBinCommandLoader, localBinExists } from '@/lib/utils/local-binaries'
import { CommandLoader } from '@/commands'
import figlet from "figlet";

const bootstrap = async () => {
  const program = new Command()
  program
    .name('ry')
    .version('0.0.1', '-v, --version', '输出当前版本')
    .usage('<command> [options]')
    .helpOption('-h, --help', '查看帮助')

  if (localBinExists()) {
    const localCommandLoader = loadLocalBinCommandLoader()
    await localCommandLoader.load(program)
  } else {
    await CommandLoader.load(program)
  }

  console.log(`${figlet.textSync('ryxg', { horizontalLayout: 'full' })}\n`);

  await program.parseAsync(process.argv)

  if (!process.argv.slice(2).length) {
    program.outputHelp()
  }
}
bootstrap()
