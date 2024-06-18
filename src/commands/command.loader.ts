import { Command } from "commander";
import { RunCommand } from "./run.command";
import { RunAction } from "@/actions";
import { ERROR_PREFIX } from "@/lib/ui/prefixes";
import chalk from "chalk";

export class CommandLoader {
  public static async load(program: Command) {
    new RunCommand(new RunAction()).load(program);

    this.handleInvalidCommand(program);
  }

  public static handleInvalidCommand(program: Command) {
    program.on('command:*', () => {
      console.error(`\n${ERROR_PREFIX} 无效的命令：${chalk.red('%s')}`, program.args.join(' '));
      console.log(`有关可用命令的列表，请参见 ${chalk.red('--help')}`);
      process.exit(1);
    })
  }
}