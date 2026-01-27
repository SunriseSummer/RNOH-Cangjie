/**
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import pathUtils from 'node:path';
import type { IFs } from 'memfs';

/**
 * @api
 */
export type CodegenConfig = {
  rnohModulePath: string;
  cppOutputPath?: string;
  projectRootPath?: string;
  debug?: boolean;
  noSafetyCheck?: boolean;
};

type ConfigArgs = CodegenConfig;

/**
 * @api
 */
export type MetroConfig = {
  port?: number;
};

/**
 * @api
 */
export type AutolinkingConfig = {
  ohPackagePath?: string;
  etsRNOHPackagesFactoryPath?: string;
  cppRNOHPackagesFactoryPath?: string;
  cmakeAutolinkPath?: string;
  excludeNpmPackages?: string[];
  includeNpmPackages?: string[];
};

type AutolinkingArgs = {
  harmonyProjectPath: string;
  nodeModulesPath: string;
  cmakeAutolinkPathRelativeToHarmony: string;
  cppRnohPackagesFactoryPathRelativeToHarmony: string;
  etsRnohPackagesFactoryPathRelativeToHarmony: string;
  ohPackagePathRelativeToHarmony: string;
  excludeNpmPackages: string | undefined;
  includeNpmPackages: string | undefined;
};

/**
 * @api
 */
export type RNOHHvigorPluginOptions = {
  nodeModulesPath?: string;
  metro?: MetroConfig | null;
  codegen: CodegenConfig | null;
  autolinking?: AutolinkingConfig | null;
};

/**
 * @api
 */
export class RNOHHvigorPluginError extends Error {}

export class ValidationError extends RNOHHvigorPluginError {
  constructor(optionName: keyof RNOHHvigorPluginOptions, msg: string) {
    super(`ValidationError: ${optionName} — ${msg}`);
  }
}

export abstract class CliExecutor {
  abstract run(
    command: string,
    args?: Record<string, string | number | boolean | undefined>
  ): string;

  protected stringifyCliArgs(
    args: Record<string, string | number | boolean | undefined>
  ): string {
    return Object.entries(args)
      .filter(([_, value]) => {
        if (typeof value === 'boolean') {
          return value;
        }
        return value !== undefined && value !== null;
      })
      .map(([key, value]) => {
        if (value === undefined) return '';

        const formattedKey = toKebabCase(key);

        if (typeof value === 'boolean') {
          return `--${formattedKey}`;
        }

        return `--${formattedKey} ${value}`;
      })
      .join(' ');
  }
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export interface Logger {
  info(message: string): void;

  warn(message: string): void;

  error(message: string): void;
}

export type FS = Pick<IFs, 'existsSync'>;

export class PrebuiltTask {
  constructor(
    private cliExecutor: CliExecutor,
    private logger: Logger,
    private fs: FS
  ) {}

  run(options: RNOHHvigorPluginOptions) {
    try {
      const input = this.prepareInput(options);
      this.runSubtasks(input);
    } catch (err) {
      if (err instanceof RNOHHvigorPluginError) {
        this.logger.error(err.message);
        throw err;
      }
      throw err;
    }
  }

  private prepareInput(options: RNOHHvigorPluginOptions) {
    const nodeModulesPath =
      options.nodeModulesPath ??
      pathUtils.join(process.cwd(), '../node_modules');
    if (!this.fs.existsSync(nodeModulesPath)) {
      throw new ValidationError('nodeModulesPath', "path doesn't exist");
    }
    if (options.codegen !== null && !options.codegen?.rnohModulePath) {
      throw new ValidationError(
        'codegen',
        'rnohModulePath must be specified if codegen is not null'
      );
    }
    return {
      nodeModulesPath,
      codegenArgs:
        options.codegen === null
          ? null
          : ({
              projectRootPath: '../',
              cppOutputPath: './entry/src/main/cpp/generated',
              ...(options.codegen ?? {}),
            } satisfies CodegenConfig),
      metro:
        options.metro === null
          ? null
          : { port: 8081, ...(options.metro ?? {}) },
      autolinkingArgs:
        options.autolinking === null
          ? null
          : ({
              harmonyProjectPath: './',
              nodeModulesPath: nodeModulesPath,
              cmakeAutolinkPathRelativeToHarmony:
                options.autolinking?.cmakeAutolinkPath ??
                './entry/src/main/cpp/autolinking.cmake',
              cppRnohPackagesFactoryPathRelativeToHarmony:
                options.autolinking?.cppRNOHPackagesFactoryPath ??
                './entry/src/main/cpp/RNOHPackagesFactory.h',
              etsRnohPackagesFactoryPathRelativeToHarmony:
                options.autolinking?.etsRNOHPackagesFactoryPath ??
                './entry/src/main/ets/RNOHPackagesFactory.ets',
              ohPackagePathRelativeToHarmony:
                options.autolinking?.ohPackagePath ?? './oh-package.json5',
              excludeNpmPackages: this.maybeWrapStringWithQuotes(
                options.autolinking?.excludeNpmPackages?.join(';') || undefined
              ),
              includeNpmPackages: this.maybeWrapStringWithQuotes(
                options.autolinking?.includeNpmPackages?.join(';') || undefined
              ),
            } satisfies AutolinkingArgs),
    };
  }

  private maybeWrapStringWithQuotes(str: string | undefined) {
    if (str === undefined || str === '') return undefined;
    return `"${str}"`;
  }

  private runSubtasks(input: {
    nodeModulesPath: string;
    metro: MetroPortForwardSubtaskInput;
    codegenArgs: CodegenConfig | null;
    autolinkingArgs: AutolinkingArgs | null;
  }) {
    (
      [
        new MetroPortForwardSubtask(this.cliExecutor, this.logger, input.metro),
        new CodegenSubtask(
          this.cliExecutor,
          this.logger,
          input.nodeModulesPath,
          input.codegenArgs
        ),
        new AutolinkingSubtask(
          this.cliExecutor,
          this.logger,
          input.autolinkingArgs
        ),
      ] satisfies Subtask[]
    ).forEach((subtask) => subtask.run());
  }
}

interface Subtask {
  run(): void;
}

type MetroPortForwardSubtaskInput = { port: any } | null;
class MetroPortForwardSubtask implements Subtask {
  constructor(
    private cliExecutor: CliExecutor,
    private logger: Logger,
    private input: MetroPortForwardSubtaskInput
  ) {}

  run(): void {
    if (this.input === null) {
      this.logger.warn('[metro] skipped port forwarding');
      return;
    }
    const result = this.cliExecutor.run(
      `hdc rport tcp:${this.input.port} tcp:${this.input.port}`
    );
    this.logger.info(`[metro] ${result}`);
  }
}

type CodegenSubtaskInput = ConfigArgs | null;

class CodegenSubtask implements Subtask {
  constructor(
    private cliExecutor: CliExecutor,
    private logger: Logger,
    private nodeModulesPath: string,
    private input: CodegenSubtaskInput
  ) {}

  run(): void {
    if (this.input === null) {
      this.logger.warn('[codegen] skipped');
      return;
    }
    const result = this.cliExecutor.run(
      pathUtils.join(this.nodeModulesPath, '.bin', 'react-native') +
        ' codegen-harmony',
      this.input
    );
    this.logger.info(`[codegen]\n${result}`);
  }
}

type AutolinkingSubtaskInput = AutolinkingArgs | null;
class AutolinkingSubtask {
  constructor(
    private cliExecutor: CliExecutor,
    private logger: Logger,
    private input: AutolinkingSubtaskInput
  ) {}

  run(): void {
    if (this.input === null) {
      this.logger.warn(`[autolink] skipped`);
      return;
    }
    const result = this.cliExecutor.run(
      pathUtils.join(this.input.nodeModulesPath, '.bin', 'react-native') +
        ' link-harmony',
      this.input
    );
    this.logger.info(`[autolink]\n${result}`);
  }
}
