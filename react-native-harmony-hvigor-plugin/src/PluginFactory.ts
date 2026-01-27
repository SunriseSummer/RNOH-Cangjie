/**
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import { HvigorPlugin } from '@ohos/hvigor';
import {
  CliExecutor,
  Logger,
  PrebuiltTask,
  RNOHHvigorPluginOptions,
} from './PrebuiltTask';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

class CliExecutorImpl extends CliExecutor {
  run(
    command: string,
    args?: Record<string, string | number | boolean>
  ): string {
    let commandWithArgs = command;
    if (args) {
      commandWithArgs += ' ' + this.stringifyCliArgs(args);
    }
    return execSync(commandWithArgs, { encoding: 'utf-8' });
  }
}

class LoggerImpl implements Logger {
  info(message: string): void {
    console.info(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(message);
  }
}

export function createRNOHHvigorPlugin(
  options: RNOHHvigorPluginOptions
): HvigorPlugin {
  return {
    pluginId: 'rnoh',
    apply: () => {
      const cliExecutor = new CliExecutorImpl();
      const logger = new LoggerImpl();
      const task = new PrebuiltTask(cliExecutor, logger, fs);
      task.run(options);
    },
  };
}
