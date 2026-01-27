/**
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import { CliExecutor, Logger } from '../src/PrebuiltTask';

export class FakeCliExecutor extends CliExecutor {
  private commands: string[] = [];

  constructor(private onRun: (command: string) => string) {
    super();
  }

  run(
    command: string,
    args?: Record<string, string | number | boolean>
  ): string {
    let commandWithArgs = command;
    if (args) {
      commandWithArgs += ' ' + this.stringifyCliArgs(args);
    }
    this.commands.push(commandWithArgs);
    return this.onRun(commandWithArgs);
  }

  getCommands() {
    return this.commands;
  }
}

export class FakeLogger implements Logger {
  private logs: { type: 'info' | 'warn' | 'error'; msg: string }[] = [];

  info(message: string) {
    this.logs.push({ type: 'info', msg: message });
  }

  warn(message: string): void {
    this.logs.push({ type: 'warn', msg: message });
  }

  error(message: string): void {
    this.logs.push({ type: 'error', msg: message });
  }

  getLogs() {
    return this.logs;
  }
}
