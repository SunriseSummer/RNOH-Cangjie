/**
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import { AbsolutePath } from '../../core';
import {
  CodeGenerator,
  CodegenError,
  SpecSchema,
  SpecSchemaType,
  UberSchema,
} from '../core';
import { GlueCodeDataV1 } from './AppBuildTimeGlueCodeGenerator';
import { NativeModuleCodeGenerator } from './NativeModuleCodeGenerator';
import { ArkTSComponentCodeGeneratorArkTS } from './ArkTSComponentCodeGeneratorArkTS';

/**
 * Generates code for libraries built on top of RNOH's ArkTS architecture.
 */
export class UberGeneratorV1 implements CodeGenerator<UberSchema> {
  private glueCodeData: GlueCodeDataV1 = { components: [], turboModules: [] };

  constructor(
    private cppOutputPath: AbsolutePath,
    private etsOutputPath: AbsolutePath,
    private codegenNoticeLines: string[]
  ) {}

  getGlueCodeData(): GlueCodeDataV1 {
    return this.glueCodeData;
  }

  generate(uberSchema: UberSchema) {
    const fileContentByPath = new Map<AbsolutePath, string>();
    const componentCodeGenerator = new ArkTSComponentCodeGeneratorArkTS(
      this.cppOutputPath,
      this.etsOutputPath.copyWithNewSegment('components'),
      this.codegenNoticeLines,
      '../../ts'
    );
    const nativeModuleCodeGenerator = new NativeModuleCodeGenerator(
      this.cppOutputPath,
      this.etsOutputPath.copyWithNewSegment('turboModules'),
      this.codegenNoticeLines,
      '../../ts'
    );
    const generatorBySpecType = {
      Component: componentCodeGenerator,
      NativeModule: nativeModuleCodeGenerator,
    } satisfies Record<SpecSchemaType, CodeGenerator<SpecSchema>>;
    for (const [_fileName, specSchema] of uberSchema
      .getSpecSchemaByFilenameMap()
      .entries()) {
      if (!(specSchema.type in generatorBySpecType)) {
        throw new CodegenError({
          whatHappened: `Could not find a code generator for a specification of type '${specSchema.type}'`,
          unexpected: true,
        });
      }
      generatorBySpecType[specSchema.type]
        .generate(specSchema)
        .forEach((fileContent, filePath) => {
          fileContentByPath.set(filePath, fileContent);
        });
    }
    this.glueCodeData = {
      components: componentCodeGenerator.getGlueCodeData(),
      turboModules: nativeModuleCodeGenerator.getGlueCodeData(),
    };
    return fileContentByPath;
  }
}
