import { Command } from 'commander'
import { AbstractCommand } from './abstract.command'
import { Input } from './command.input'
import prompts from 'prompts'
import chalk from 'chalk'
import { getRemainingFlags } from '@/lib/utils/remaining-flags'

const PlatformChoices = [
  { title: 'Android', value: 'android' },
  // { title: '微信小程序', value: 'wx' },
]

export class RunCommand extends AbstractCommand {
  public load(program: Command): void {
    program
      .command('run')
      .argument('[platform]', '运行平台', (value) => {
        const result = PlatformChoices.some(item => item.value === value)
        return result ? value : ''
      })
      .allowUnknownOption()
      .option('-cu --custom', '自定义基座')
      .option('-p --path', '项目路径')
      .description('启动应用')
      .action(async (platform: string, option: any) => {
        const result = await prompts(
          [
            {
              name: 'platform',
              type: !platform ? 'select' : null,
              message: '选择平台',
              choices: PlatformChoices,
            },
          ],
          {
            onCancel() {
              console.log(chalk.red('✖') + ' 操作被取消')
              process.exit(1)
            },
          }
        )
        const options: Input[] = []
        options.push({ name: 'custom', value: !!option.custom })
        options.push({ name: 'path', value: option.path || process.cwd() })

        const inputs: Input[] = []
        inputs.push({ name: 'platform', value: platform || result.platform })

        const flags = getRemainingFlags(program);
        
        try {
          await this.action.handle(inputs, options, flags)
        } catch (error) {
          process.exit(1)
        }
      })
  }
}
