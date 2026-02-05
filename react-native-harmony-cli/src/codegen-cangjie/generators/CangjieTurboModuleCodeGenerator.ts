/**
 * Copyright (c) 2025 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import Case from 'case';
import { AbsolutePath } from '../../core';
import { CodegenError, SpecCodeGenerator, SpecSchema } from '../../codegen/core';
import { TypeAnnotation } from '../../codegen/core/TypeAnnotationToTS';
import { TypeAnnotationToCangjie } from '../core';
import {
  CangjieBridgeTemplate,
  CangjieForeignTemplate,
  CangjiePackageInitTemplate,
  CangjieTurboModuleTemplate,
  CppBridgeCppTemplate,
  CppBridgeHTemplate,
  CppTurboModuleCppTemplate,
  CppTurboModuleHTemplate,
} from '../templates';

// Default placeholder for object/array arguments when a value is missing.
const DEFAULT_EMPTY_JSON_STRING = '{}';

type ParamKind = 'string' | 'boolean' | 'number' | 'object' | 'array' | 'unknown';

function unwrapNullable(typeAnnotation: TypeAnnotation): TypeAnnotation {
  if (typeAnnotation.type === 'NullableTypeAnnotation') {
    return typeAnnotation.typeAnnotation;
  }
  return typeAnnotation;
}

function getParamKind(typeAnnotation: TypeAnnotation): ParamKind {
  const resolved = unwrapNullable(typeAnnotation);
  switch (resolved.type) {
    case 'BooleanTypeAnnotation':
      return 'boolean';
    case 'StringTypeAnnotation':
    case 'StringEnumTypeAnnotation':
      return 'string';
    case 'Int32TypeAnnotation':
    case 'Int32EnumTypeAnnotation':
    case 'DoubleTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'NumberTypeAnnotation':
      return 'number';
    case 'ArrayTypeAnnotation':
      return 'array';
    case 'ObjectTypeAnnotation':
    case 'GenericObjectTypeAnnotation':
      return 'object';
    case 'ReservedTypeAnnotation':
      if (resolved.name === 'RootTag') {
        return 'number';
      }
      return 'unknown';
    default:
      return 'unknown';
  }
}

function getCppBridgeType(typeAnnotation: TypeAnnotation): string {
  switch (getParamKind(typeAnnotation)) {
    case 'string':
    case 'object':
    case 'array':
      return 'const char*';
    case 'boolean':
      return 'bool';
    case 'number':
      return 'int32_t';
    default:
      return 'const char*';
  }
}

function getCangjieFfiType(typeAnnotation: TypeAnnotation): string {
  switch (getParamKind(typeAnnotation)) {
    case 'string':
    case 'object':
    case 'array':
      return 'CString';
    case 'boolean':
      return 'Bool';
    case 'number':
      return 'Int32';
    default:
      return 'CString';
  }
}

function buildCppArgDeclaration(
  paramName: string,
  typeAnnotation: TypeAnnotation,
  index: number
) {
  const kind = getParamKind(typeAnnotation);
  switch (kind) {
    case 'string':
      return {
        argName: paramName,
        lines: [
          `auto ${paramName} = args[${index}].asString(rt).utf8(rt);`,
        ],
      };
    case 'boolean':
      return {
        argName: paramName,
        lines: [`auto ${paramName} = args[${index}].getBool();`],
      };
    case 'number':
      return {
        argName: paramName,
        lines: [
          `auto ${paramName} = static_cast<int32_t>(args[${index}].asNumber());`,
        ],
      };
    case 'object':
    case 'array':
    case 'unknown':
    default: {
      const jsonName = `${paramName}Json`;
      return {
        argName: jsonName,
        lines: [
          `const std::string ${jsonName}DefaultValue = "${DEFAULT_EMPTY_JSON_STRING}";`,
          `std::string ${jsonName} = ${jsonName}DefaultValue;`,
          `if (count > ${index} && args[${index}].isObject()) {`,
          `  auto jsonObj = rt.global().getPropertyAsObject(rt, "JSON");`,
          `  auto stringify = jsonObj.getPropertyAsFunction(rt, "stringify");`,
          `  auto jsonString = stringify.call(rt, args[${index}]);`,
          `  if (jsonString.isString()) {`,
          `    ${jsonName} = jsonString.asString(rt).utf8(rt);`,
          `  }`,
          `}`,
        ],
      };
    }
  }
}

function buildCangjieArgConversion(paramName: string, ffiType: string) {
  if (ffiType !== 'CString') {
    return { convertedName: paramName, lines: [] };
  }
  const convertedName = `${paramName}Value`;
  return {
    convertedName,
    lines: [`let ${convertedName} = ${paramName}.toString()`],
  };
}

export class CangjieTurboModuleCodeGenerator implements SpecCodeGenerator {
  constructor(
    private cppOutputPath: AbsolutePath,
    private cppBridgeOutputPath: AbsolutePath,
    private cangjieOutputPath: AbsolutePath,
    private cangjiePackagePrefix: string,
    private codegenNoticeLines: string[]
  ) {}

  generate(schema: SpecSchema): Map<AbsolutePath, string> {
    if (schema.type !== 'NativeModule') {
      throw new CodegenError({
        whatHappened: `CangjieTurboModuleCodeGenerator can't generate code for module type: ${schema.type}`,
        unexpected: true,
      });
    }

    const result = new Map<AbsolutePath, string>();
    const typeAnnotationToCangjie = new TypeAnnotationToCangjie();
    const moduleName = schema.moduleName;
    const className = `${moduleName}TurboModule`;
    const bridgeNamespace = `${moduleName}Bridge`;
    const isEnabledName = `isCj${moduleName}Enabled`;
    const packageName = `${this.cangjiePackagePrefix}.${moduleName}`;
    const moduleDirPath = this.cangjieOutputPath.copyWithNewSegment(moduleName);

    const cangjieTemplate = new CangjieTurboModuleTemplate(
      className,
      packageName,
      this.codegenNoticeLines
    );
    const bridgeTemplate = new CangjieBridgeTemplate(
      packageName,
      this.codegenNoticeLines
    );
    const foreignTemplate = new CangjieForeignTemplate(
      packageName,
      this.codegenNoticeLines
    );
    const packageInitTemplate = new CangjiePackageInitTemplate(
      className,
      packageName,
      this.codegenNoticeLines
    );
    const cppHeaderTemplate = new CppTurboModuleHTemplate(
      className,
      this.codegenNoticeLines
    );
    const cppCppTemplate = new CppTurboModuleCppTemplate(
      className,
      `${moduleName}Bridge.h`,
      bridgeNamespace,
      this.codegenNoticeLines
    );
    const cppBridgeHeaderTemplate = new CppBridgeHTemplate(
      `${Case.constant(`${moduleName}Bridge`)}_H`,
      bridgeNamespace,
      isEnabledName
    );
    const cppBridgeCppTemplate = new CppBridgeCppTemplate(
      `${moduleName}Bridge.h`,
      bridgeNamespace,
      isEnabledName,
      this.codegenNoticeLines
    );

    Object.entries(schema.aliasMap).forEach(([name, typeAnnotation]) => {
      cangjieTemplate.addAlias({
        name,
        type: typeAnnotationToCangjie.convert(typeAnnotation),
      });
    });

    Object.entries(schema.enumMap).forEach(([name, enumSpec]) => {
      const enumMembers = Array.isArray(enumSpec.members)
        ? enumSpec.members
        : [];
      const enumType =
        enumMembers.length > 0 && typeof enumMembers[0].value === 'number'
          ? 'Int32'
          : 'String';
      cangjieTemplate.addEnum({ name, type: enumType });
    });

    schema.spec.properties.forEach((prop) => {
      if (prop.typeAnnotation.type !== 'FunctionTypeAnnotation') {
        return;
      }
      const methodName = prop.name;
      const pascalName = Case.pascal(methodName);
      const returnsPromise =
        prop.typeAnnotation.returnTypeAnnotation.type ===
        'PromiseTypeAnnotation';
      const returnType = typeAnnotationToCangjie.convertReturnType(
        prop.typeAnnotation.returnTypeAnnotation
      );
      const stringifiedArgs = prop.typeAnnotation.params
        .map(
          (param) =>
            `${param.name}: ${typeAnnotationToCangjie.convert(
              param.typeAnnotation
            )}`
        )
        .join(', ');

      cangjieTemplate.addMethod({
        name: methodName,
        stringifiedArgs,
        returnType,
      });
      cppHeaderTemplate.addMethod({ name: methodName });

      const cppArgDeclarations: { line: string }[] = [];
      const cppArgNames: string[] = [];
      prop.typeAnnotation.params.forEach((param, index) => {
        const cppArg = buildCppArgDeclaration(
          param.name,
          param.typeAnnotation,
          index
        );
        cppArgDeclarations.push(...cppArg.lines.map((line) => ({ line })));
        cppArgNames.push(cppArg.argName);
      });

      const cppCallArgs = cppArgNames.join(', ');
      const cppCallArgsWithPromise = cppCallArgs.length
        ? `promiseHolder, ${cppCallArgs}`
        : 'promiseHolder';

      cppCppTemplate.addMethod({
        name: methodName,
        argsCount: prop.typeAnnotation.params.length,
        isAsync: returnsPromise,
        cppArgDeclarations,
        cppCallArgs,
        cppCallArgsWithPromise,
      });

      const callbackTypeName = `${pascalName}Callback`;
      const callbackName = `${Case.camel(methodName)}Callback`;
      const cppBridgeParams = prop.typeAnnotation.params
        .map(
          (param) =>
            `${getCppBridgeType(param.typeAnnotation)} ${param.name}`
        )
        .join(', ');
      const cppBridgeParamsWithPromise = cppBridgeParams.length
        ? `void* promiseHolder, ${cppBridgeParams}`
        : 'void* promiseHolder';

      cppBridgeHeaderTemplate.addCallback({
        callbackReturnType: 'void',
        callbackName: callbackTypeName,
        callbackParams: returnsPromise
          ? cppBridgeParamsWithPromise
          : cppBridgeParams,
      });
      cppBridgeHeaderTemplate.addRegister({
        registerName: `register${pascalName}Callback`,
        callbackTypeName,
      });
      cppBridgeHeaderTemplate.addMethod({
        returnType: 'void',
        name: methodName,
        params: returnsPromise
          ? cppBridgeParamsWithPromise
          : cppBridgeParams,
      });

      cppBridgeCppTemplate.addCallback({
        callbackTypeName,
        callbackName,
      });
      cppBridgeCppTemplate.addRegister({
        registerName: `register${pascalName}Callback`,
        callbackTypeName,
        callbackName,
      });
      const callbackArgNames = prop.typeAnnotation.params.map((param) => param.name);
      const cppBridgeCallArgs = returnsPromise
        ? ['promiseHolder', ...callbackArgNames].join(', ')
        : callbackArgNames.join(', ');

      cppBridgeCppTemplate.addMethod({
        returnType: 'void',
        name: methodName,
        params: returnsPromise
          ? cppBridgeParamsWithPromise
          : cppBridgeParams,
        callArgs: cppBridgeCallArgs,
        callbackName,
        isAsync: returnsPromise,
        hasReturn: false,
      });

      const cangjieFfiParams = prop.typeAnnotation.params.map((param) => ({
        name: param.name,
        ffiType: getCangjieFfiType(param.typeAnnotation),
      }));
      const cangjieParams = cangjieFfiParams
        .map((param) => `${param.name}: ${param.ffiType}`)
        .join(', ');
      const cangjieParamsWithPromise = cangjieParams.length
        ? `promise: PromiseHolder, ${cangjieParams}`
        : 'promise: PromiseHolder';

      const argConversions: { line: string }[] = [];
      const callArgs: string[] = [];
      cangjieFfiParams.forEach((param) => {
        const conversion = buildCangjieArgConversion(param.name, param.ffiType);
        argConversions.push(...conversion.lines.map((line) => ({ line })));
        callArgs.push(conversion.convertedName);
      });

      const callArgsString = callArgs.join(', ');
      const asyncCallLine =
        returnType === 'Unit'
          ? `module.${methodName}(${callArgsString})`
          : `let result = module.${methodName}(${callArgsString})`;
      const asyncResolveLine =
        returnType === 'Unit'
          ? 'PromiseResolve(promise)'
          : 'PromiseResolve(promise, result)';
      const syncCallLine =
        returnType === 'Unit'
          ? `module.${methodName}(${callArgsString})`
          : `let _ = module.${methodName}(${callArgsString})`;

      bridgeTemplate.addMethod({
        name: methodName,
        cFunctionName: `C${pascalName}`,
        stringifiedParams: returnsPromise
          ? cangjieParamsWithPromise
          : cangjieParams,
        callArgs: callArgsString,
        argConversions,
        isAsync: returnsPromise,
        asyncCallLine,
        asyncResolveLine,
        syncCallLine,
      });
      foreignTemplate.addMethod({
        registerName: `register${pascalName}Callback`,
        callbackSignature: returnsPromise
          ? ['PromiseHolder', ...cangjieFfiParams.map((p) => p.ffiType)].join(
              ', '
            )
          : cangjieFfiParams.map((p) => p.ffiType).join(', '),
      });
      packageInitTemplate.addMethod({
        registerName: `register${pascalName}Callback`,
        cFunctionName: `C${pascalName}`,
      });
    });

    result.set(
      this.cppOutputPath.copyWithNewSegment(`${className}.h`),
      cppHeaderTemplate.build()
    );
    result.set(
      this.cppOutputPath.copyWithNewSegment(`${className}.cpp`),
      cppCppTemplate.build()
    );
    result.set(
      this.cppBridgeOutputPath.copyWithNewSegment(`${moduleName}Bridge.h`),
      cppBridgeHeaderTemplate.build()
    );
    result.set(
      this.cppBridgeOutputPath.copyWithNewSegment(`${moduleName}Bridge.cpp`),
      cppBridgeCppTemplate.build()
    );
    result.set(
      moduleDirPath.copyWithNewSegment(`${className}.cj`),
      cangjieTemplate.build()
    );
    result.set(
      moduleDirPath.copyWithNewSegment('bridge.cj'),
      bridgeTemplate.build()
    );
    result.set(
      moduleDirPath.copyWithNewSegment('foreign.cj'),
      foreignTemplate.build()
    );
    result.set(
      moduleDirPath.copyWithNewSegment('packageinit.cj'),
      packageInitTemplate.build()
    );

    return result;
  }
}
