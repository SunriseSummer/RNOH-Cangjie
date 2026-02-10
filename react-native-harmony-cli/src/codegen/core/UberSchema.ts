/**
 * Copyright (c) 2024-2025 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import {
  ComponentSchema,
  NativeModuleSchema,
  SchemaType as RawUberSchema,
} from '@react-native/codegen/lib/CodegenSchema';
import {
  AbsolutePath,
  ValueObject,
  PackageJSON,
  ProjectDependenciesManager,
  CodegenConfig,
  FS
} from '../../core';
import fs from 'fs';
import os from 'os';
import path from 'path';
// @ts-expect-error
import extractUberSchemaFromSpecFilePaths_ from '@react-native/codegen/lib/cli/combine/combine-js-to-schema.js';
import { CodegenError } from './CodegenError';

const DEFAULT_PARAM_REGEX =
  /(\b[$A-Za-z_][\w$]*)(\s*\?)?\s*:\s*([^,)=]+?)\s*=\s*([^,)]+)/g;
const INT32_TYPE_REGEX = /\bint32\b/g;

/**
 * 仅接受简单字面量作为默认值（字符串/数值/布尔/null）。
 * 复杂表达式会被移除默认值以保证 Codegen 可以解析。
 */
function normalizeDefaultValue(rawValue: string): string | null {
  const value = rawValue.trim();
  if (value === 'true' || value === 'false' || value === 'null') {
    return value;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  if (/^(['"]).*\1$/.test(value)) {
    return value;
  }
  return null;
}

/**
 * 将 TS 接口方法参数的默认值语法转换为 WithDefault<>，
 * 避免 RN Codegen 的解析器直接抛错。
 */
function transformDefaultParams(source: string): {
  content: string;
  didChange: boolean;
} {
  let didChange = false;
  const content = source.replace(
    DEFAULT_PARAM_REGEX,
    (_match, name, optionalFlag, typeText, defaultText) => {
      const normalizedDefault = normalizeDefaultValue(defaultText);
      didChange = true;
      if (normalizedDefault) {
        return `${name}: WithDefault<${typeText.trim()}, ${normalizedDefault}>`;
      }
      const optionalSuffix = optionalFlag ?? '';
      return `${name}${optionalSuffix}: ${typeText.trim()}`;
    }
  );
  return { content, didChange };
}

/**
 * 将 int32 类型别名统一替换为 Codegen 可识别的 Int32。
 */
function transformInt32Types(source: string): {
  content: string;
  didChange: boolean;
} {
  const content = source.replace(INT32_TYPE_REGEX, 'Int32');
  return { content, didChange: content !== source };
}

/**
 * 为 TS spec 文件预处理默认值语法与 int32 别名，输出临时文件用于 Codegen。
 */
function prepareSpecFilePaths(
  projectSourceFilePaths: AbsolutePath[]
): AbsolutePath[] {
  let tempDir: string | null = null;
  return projectSourceFilePaths.map((specPath, index) => {
    const filePath = specPath.getValue();
    const ext = path.extname(filePath);
    if (ext !== '.ts' && ext !== '.tsx') {
      return specPath;
    }
    const source = fs.readFileSync(filePath, 'utf8');
    const defaultTransformed = transformDefaultParams(source);
    const int32Transformed = transformInt32Types(defaultTransformed.content);
    const content = int32Transformed.content;
    const didChange = defaultTransformed.didChange || int32Transformed.didChange;
    if (!didChange) {
      return specPath;
    }
    if (!tempDir) {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rnoh-codegen-'));
    }
    const tempPath = path.join(
      tempDir,
      `${index}-${path.basename(filePath)}`
    );
    fs.writeFileSync(tempPath, content);
    return new AbsolutePath(tempPath);
  });
}

function createRawUberSchemaFromSpecFilePaths(
  projectSourceFilePaths: AbsolutePath[]
): RawUberSchema {
  return extractUberSchemaFromSpecFilePaths_(
    prepareSpecFilePaths(projectSourceFilePaths).map((p) => p.getValue())
  );
}

export type SpecSchema = ComponentSchema | NativeModuleSchema;
export type SpecSchemaType = SpecSchema['type'];
type FindSpecSchemaByType<
  TType extends SpecSchemaType,
  TSpecSchema = SpecSchema
> = TSpecSchema extends { type: TType } ? TSpecSchema : never;

/**
 * Contains component and turbo module (NativeModule) schemas. The "Uber" word is used here to highlight that SpecSchemas don't extend this class.
 */
export class UberSchema implements ValueObject {
  static fromSpecFilePaths(specPaths: AbsolutePath[]): UberSchema {
    return new UberSchema(createRawUberSchemaFromSpecFilePaths(specPaths));
  }

  static fromCodegenConfig(codegenConfig: CodegenConfig): UberSchema {
    try {
      return new UberSchema(
        createRawUberSchemaFromSpecFilePaths(codegenConfig.getSpecFilePaths())
      );
    } catch (err) {
      if (err instanceof Error) {
        throw new CodegenError({
          whatHappened: "Couldn't create the schema",
          whatCanUserDo: [
            `There's probably at least one spec file defined in your project or in a third-party package that breaks some code generation restrictions. Please check the message below. If it's ambiguous, debug the problem with divide and conquer strategy.\n\n${err.message}`,
          ],
        });
      }
      throw err;
    }
  }

  static async fromProject(
    fs: FS,
    projectRootPath: AbsolutePath,
    onShouldAcceptCodegenConfig?: (
      codegenVersion: number,
      packageName: string
    ) => boolean
  ): Promise<UberSchema> {
    const onShouldAcceptCodegenConfig_ =
      onShouldAcceptCodegenConfig ?? ((x: number) => true);
    const packageJSON = PackageJSON.fromProjectRootPath(
      fs,
      projectRootPath,
      projectRootPath
    );
    const acceptedCodegenConfigs: CodegenConfig[] = [];
    const appCodegenConfigs = packageJSON.getCodegenConfigs();
    for (const codegenConfig of appCodegenConfigs) {
      if (
        onShouldAcceptCodegenConfig_(
          codegenConfig.getVersion(),
          packageJSON.name
        )
      ) {
        acceptedCodegenConfigs.push(codegenConfig);
      }
    }
    await new ProjectDependenciesManager(fs, projectRootPath).forEachAsync(
      (dependency) => {
        const codegenConfigs = dependency.getCodegenConfigs();
        for (const codegenConfig of codegenConfigs) {
          if (
            onShouldAcceptCodegenConfig_(
              codegenConfig.getVersion(),
              dependency.readPackageJSON().name
            )
          ) {
            acceptedCodegenConfigs.push(codegenConfig);
          }
        }
      }
    );
    try {
      return new UberSchema(
        createRawUberSchemaFromSpecFilePaths(
          acceptedCodegenConfigs.flatMap((codegenConfig) =>
            codegenConfig.getSpecFilePaths()
          )
        )
      );
    } catch (err) {
      if (err instanceof Error) {
        throw new CodegenError({
          whatHappened: "Couldn't create the schema",
          whatCanUserDo: [
            `There's probably at least one spec file defined in your project or in a third-party package that breaks some code generation restrictions. Please check the message below. If it's ambiguous, debug the problem with divide and conquer strategy.\n\n${err.message}`,
          ],
        });
      }
      throw err;
    }
  }

  private constructor(private schemaValue: RawUberSchema) {}

  getValue(): RawUberSchema {
    return this.schemaValue;
  }

  findAllSpecSchemasByType<TSpecSchemaType extends SpecSchemaType>(
    schemaType: TSpecSchemaType
  ): FindSpecSchemaByType<TSpecSchemaType>[] {
    return Object.values(this.schemaValue.modules)
      .filter((module) => module.type === schemaType)
      .map((module) => module as FindSpecSchemaByType<TSpecSchemaType>);
  }

  getSpecSchemaByFilenameMap(): ReadonlyMap<string, SpecSchema> {
    return Object.entries(this.schemaValue.modules).reduce(
      (acc, [moduleName, moduleSchema]) => {
        acc.set(moduleName, moduleSchema);
        return acc;
      },
      new Map<string, SpecSchema>()
    );
  }
}
