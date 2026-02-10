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

// object/array 缺省时使用的 JSON 字符串占位符，避免序列化失败。
const DEFAULT_EMPTY_JSON_OBJECT = '{}';
const DEFAULT_EMPTY_JSON_ARRAY = '[]';

type ParamKind =
  | 'string'
  | 'boolean'
  | 'int32'
  | 'number'
  | 'object'
  | 'array'
  | 'unknown';

type ReturnKind =
  | 'void'
  | 'string'
  | 'boolean'
  | 'int32'
  | 'number'
  | 'array'
  | 'json'
  | 'unknown';

type ArrayElementKind = 'string' | 'boolean' | 'int32' | 'number' | 'unknown';

type ReturnTypeInfo = {
  kind: ReturnKind;
  isOptional: boolean;
  arrayElementKind?: ArrayElementKind;
};

type ArrayTypeAnnotation = Extract<TypeAnnotation, { type: 'ArrayTypeAnnotation' }>;

type SyncReturnInfo = {
  needsLibC: boolean;
  needsJsonImport: boolean;
  lines: string[];
};

/**
 * 处理可空类型，便于后续按实际类型分支。
 */
function unwrapNullable(typeAnnotation: TypeAnnotation): TypeAnnotation {
  if (typeAnnotation.type === 'NullableTypeAnnotation') {
    return typeAnnotation.typeAnnotation;
  }
  return typeAnnotation;
}

/**
 * 解析类型别名，避免数组/返回值判断时遗漏真实类型。
 */
function resolveAliasTypeAnnotation(
  typeAnnotation: TypeAnnotation,
  aliasMap: Record<string, TypeAnnotation>,
  visited: Set<string> = new Set()
): TypeAnnotation {
  if (typeAnnotation.type === 'TypeAliasTypeAnnotation') {
    const alias = aliasMap[typeAnnotation.name];
    if (alias && !visited.has(typeAnnotation.name)) {
      visited.add(typeAnnotation.name);
      return resolveAliasTypeAnnotation(alias, aliasMap, visited);
    }
    if (typeAnnotation.name === 'int32' || typeAnnotation.name === 'Int32') {
      return { type: 'Int32TypeAnnotation' } as TypeAnnotation;
    }
  }
  return typeAnnotation;
}

/**
 * 提取数组元素类型，并分类为可桥接的基础类型。
 */
function getArrayElementKind(
  typeAnnotation: TypeAnnotation,
  aliasMap: Record<string, TypeAnnotation>,
  enumKindMap: Map<string, ReturnKind>
): ArrayElementKind {
  const resolved = resolveAliasTypeAnnotation(
    unwrapNullable(typeAnnotation),
    aliasMap
  );
  switch (resolved.type) {
    case 'StringTypeAnnotation':
    case 'StringEnumTypeAnnotation':
      return 'string';
    case 'BooleanTypeAnnotation':
      return 'boolean';
    case 'Int32TypeAnnotation':
    case 'Int32EnumTypeAnnotation':
      return 'int32';
    case 'DoubleTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'NumberTypeAnnotation':
      return 'number';
    case 'EnumDeclaration': {
      const enumKind = enumKindMap.get(resolved.name);
      if (enumKind === 'string') {
        return 'string';
      }
      if (enumKind === 'int32') {
        return 'int32';
      }
      return 'unknown';
    }
    case 'ReservedTypeAnnotation':
      return resolved.name === 'RootTag' ? 'int32' : 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * 解析数组类型（含别名/可空包装）。
 */
function resolveArrayTypeAnnotation(
  typeAnnotation: TypeAnnotation,
  aliasMap: Record<string, TypeAnnotation>
): ArrayTypeAnnotation | null {
  const resolved = resolveAliasTypeAnnotation(
    unwrapNullable(typeAnnotation),
    aliasMap
  );
  return resolved.type === 'ArrayTypeAnnotation' ? resolved : null;
}

/**
 * 判断参数是否为数组类型，用于决定是否生成 JsonValue。
 * 这里会展开 Nullable/TypeAlias，确保数组别名也被识别。
 */
function isJsonArrayTypeAnnotation(
  typeAnnotation: TypeAnnotation,
  aliasMap: Record<string, TypeAnnotation>
): boolean {
  return resolveArrayTypeAnnotation(typeAnnotation, aliasMap) !== null;
}

/**
 * 判断参数是否为对象类型（Object/GenericObject），用于决定是否生成 JsonValue。
 * 这里会先展开 Nullable/TypeAlias，保证对 type alias 的处理一致。
 * 返回 true：ObjectTypeAnnotation / GenericObjectTypeAnnotation（含别名包装）。
 * 返回 false：保持原有 String/Array/数值等转换路径。
 */
function isJsonObjectTypeAnnotation(
  typeAnnotation: TypeAnnotation,
  aliasMap: Record<string, TypeAnnotation>
): boolean {
  const resolved = resolveAliasTypeAnnotation(
    unwrapNullable(typeAnnotation),
    aliasMap
  );
  return (
    resolved.type === 'ObjectTypeAnnotation' ||
    resolved.type === 'GenericObjectTypeAnnotation'
  );
}

/**
 * 根据类型注解分类，决定桥接侧的参数处理方式。
 */
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
      return 'int32';
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
        return 'int32';
      }
      return 'unknown';
    case 'TypeAliasTypeAnnotation':
      return resolved.name === 'int32' || resolved.name === 'Int32'
        ? 'int32'
        : 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * 获取 C++ 桥接层参数类型（用于回调声明）。
 */
function getCppBridgeType(typeAnnotation: TypeAnnotation): string {
  switch (getParamKind(typeAnnotation)) {
    case 'string':
    case 'object':
    case 'array':
      return 'const char*';
    case 'boolean':
      return 'bool';
    case 'int32':
      return 'int32_t';
    case 'number':
      return 'double';
    default:
      return 'const char*';
  }
}

/**
 * 获取 Cangjie FFI 侧参数类型。
 */
function getCangjieFfiType(typeAnnotation: TypeAnnotation): string {
  switch (getParamKind(typeAnnotation)) {
    case 'string':
    case 'object':
    case 'array':
      return 'CString';
    case 'boolean':
      return 'Bool';
    case 'int32':
      return 'Int32';
    case 'number':
      return 'Float64';
    default:
      return 'CString';
  }
}

/**
 * 构建 C++ 包装层的参数解析语句。
 */
function buildCppArgDeclaration(
  paramName: string,
  typeAnnotation: TypeAnnotation,
  index: number,
  isOptional: boolean
) {
  const kind = getParamKind(typeAnnotation);
  // 可选/可空参数使用默认值并做 isX 检查，避免直接读取导致崩溃。
  const needsGuard = isOptional || typeAnnotation.type === 'NullableTypeAnnotation';
  switch (kind) {
    case 'string':
      if (needsGuard) {
        return {
          callArg: `${paramName}.c_str()`,
          lines: [
            `std::string ${paramName} = "";`,
            `if (count > ${index} && args[${index}].isString()) {`,
            `  ${paramName} = args[${index}].asString(rt).utf8(rt);`,
            `}`,
          ],
        };
      }
      return {
        callArg: `${paramName}.c_str()`,
        lines: [
          `auto ${paramName} = args[${index}].asString(rt).utf8(rt);`,
        ],
      };
    case 'boolean':
      if (needsGuard) {
        return {
          callArg: paramName,
          lines: [
            `bool ${paramName} = false;`,
            `if (count > ${index} && args[${index}].isBool()) {`,
            `  ${paramName} = args[${index}].getBool();`,
            `}`,
          ],
        };
      }
      return {
        callArg: paramName,
        lines: [`auto ${paramName} = args[${index}].getBool();`],
      };
    case 'int32':
      if (needsGuard) {
        return {
          callArg: paramName,
          lines: [
            `int32_t ${paramName} = 0;`,
            `if (count > ${index} && args[${index}].isNumber()) {`,
            `  ${paramName} = static_cast<int32_t>(args[${index}].asNumber());`,
            `}`,
          ],
        };
      }
      return {
        callArg: paramName,
        lines: [
          `auto ${paramName} = static_cast<int32_t>(args[${index}].asNumber());`,
        ],
      };
    case 'number':
      if (needsGuard) {
        return {
          callArg: paramName,
          lines: [
            `double ${paramName} = 0.0;`,
            `if (count > ${index} && args[${index}].isNumber()) {`,
            `  ${paramName} = args[${index}].asNumber();`,
            `}`,
          ],
        };
      }
      return {
        callArg: paramName,
        lines: [`auto ${paramName} = args[${index}].asNumber();`],
      };
    case 'object':
    case 'array':
    case 'unknown':
    default: {
      const jsonName = `${paramName}Json`;
      const defaultJson =
        kind === 'array' ? DEFAULT_EMPTY_JSON_ARRAY : DEFAULT_EMPTY_JSON_OBJECT;
      return {
        callArg: `${jsonName}.c_str()`,
        lines: [
          `const std::string ${jsonName}DefaultValue = "${defaultJson}";`,
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

/**
 * 构建 Cangjie 侧参数转换逻辑（CString -> String）。
 */
type CangjieArgConversion = {
  convertedName: string;
  lines: string[];
  needsJsonStreamImport: boolean;
  needsStdIoImport: boolean;
  needsJsonImport: boolean;
};

function buildCangjieArgConversion(
  paramName: string,
  ffiType: string,
  typeAnnotation: TypeAnnotation,
  aliasMap: Record<string, TypeAnnotation>
): CangjieArgConversion {
  if (ffiType !== 'CString') {
    return {
      convertedName: paramName,
      lines: [],
      needsJsonStreamImport: false,
      needsStdIoImport: false,
      needsJsonImport: false,
    };
  }
  const stringValueName = `${paramName}Value`;
  const lines = [`let ${stringValueName} = ${paramName}.toString()`];
  if (isJsonArrayTypeAnnotation(typeAnnotation, aliasMap)) {
    const jsonValueName = `${paramName}JsonValue`;
    // Array 参数仅需解析为 JsonValue，交由业务层自行转换。
    lines.push(`let ${jsonValueName} = JsonValue.fromStr(${stringValueName})`);
    return {
      convertedName: jsonValueName,
      lines,
      needsJsonStreamImport: false,
      needsStdIoImport: false,
      needsJsonImport: true,
    };
  }
  if (isJsonObjectTypeAnnotation(typeAnnotation, aliasMap)) {
    const jsonValueName = `${paramName}JsonValue`;
    // Object 参数需要把 JSON 字符串直接解析成 JsonValue，交由业务层继续取值。
    lines.push(`let ${jsonValueName} = JsonValue.fromStr(${stringValueName})`);
    return {
      convertedName: jsonValueName,
      lines,
      needsJsonStreamImport: false,
      needsStdIoImport: false,
      needsJsonImport: true,
    };
  }
  return {
    convertedName: stringValueName,
    lines,
    needsJsonStreamImport: false,
    needsStdIoImport: false,
    needsJsonImport: false,
  };
}

/**
 * 解析返回类型，决定同步返回/Promise Resolve 的包装策略。
 * 复杂对象与数组使用 JSON 字符串回传，保持 JS 侧结构一致。
 */
function getReturnTypeInfo(
  typeAnnotation: TypeAnnotation,
  aliasMap: Record<string, TypeAnnotation>,
  enumKindMap: Map<string, ReturnKind>
): ReturnTypeInfo {
  switch (typeAnnotation.type) {
    case 'NullableTypeAnnotation': {
      const inner = getReturnTypeInfo(
        typeAnnotation.typeAnnotation,
        aliasMap,
        enumKindMap
      );
      return { ...inner, isOptional: true };
    }
    case 'VoidTypeAnnotation':
      return { kind: 'void', isOptional: false };
    case 'BooleanTypeAnnotation':
      return { kind: 'boolean', isOptional: false };
    case 'StringTypeAnnotation':
    case 'StringEnumTypeAnnotation':
      return { kind: 'string', isOptional: false };
    case 'Int32TypeAnnotation':
    case 'Int32EnumTypeAnnotation':
      return { kind: 'int32', isOptional: false };
    case 'DoubleTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'NumberTypeAnnotation':
      return { kind: 'number', isOptional: false };
    case 'ArrayTypeAnnotation': {
      if (!typeAnnotation.elementType) {
        return { kind: 'json', isOptional: false };
      }
      const elementKind = getArrayElementKind(
        typeAnnotation.elementType,
        aliasMap,
        enumKindMap
      );
      if (elementKind === 'unknown') {
        return { kind: 'json', isOptional: false };
      }
      return {
        kind: 'array',
        isOptional: false,
        arrayElementKind: elementKind,
      };
    }
    case 'ObjectTypeAnnotation':
    case 'GenericObjectTypeAnnotation':
    case 'UnionTypeAnnotation':
    case 'MixedTypeAnnotation':
    case 'ReservedPropTypeAnnotation':
      return { kind: 'json', isOptional: false };
    case 'ReservedTypeAnnotation':
      return {
        kind: typeAnnotation.name === 'RootTag' ? 'int32' : 'unknown',
        isOptional: false,
      };
    case 'TypeAliasTypeAnnotation': {
      const alias = aliasMap[typeAnnotation.name];
      if (alias) {
        return getReturnTypeInfo(alias, aliasMap, enumKindMap);
      }
      if (typeAnnotation.name === 'int32' || typeAnnotation.name === 'Int32') {
        return { kind: 'int32', isOptional: false };
      }
      return { kind: 'unknown', isOptional: false };
    }
    case 'EnumDeclaration':
      return {
        kind: enumKindMap.get(typeAnnotation.name) ?? 'unknown',
        isOptional: false,
      };
    case 'PromiseTypeAnnotation':
      return typeAnnotation.elementType
        ? getReturnTypeInfo(typeAnnotation.elementType, aliasMap, enumKindMap)
        : { kind: 'unknown', isOptional: false };
    default:
      return { kind: 'unknown', isOptional: false };
  }
}

/**
 * 构造数组转 JSON 的桥接代码片段。
 */
function buildArrayJsonLines(
  sourceName: string,
  elementKind: ArrayElementKind,
  arrayVarName: string
) {
  const lines = [`let ${arrayVarName} = JsonArray()`];
  const elementName = `${arrayVarName}Item`;
  lines.push(`for (${elementName} in ${sourceName}) {`);
  switch (elementKind) {
    case 'string':
      lines.push(`  ${arrayVarName}.add(JsonString(${elementName}))`);
      break;
    case 'boolean':
      lines.push(`  ${arrayVarName}.add(JsonBool(${elementName}))`);
      break;
    case 'int32':
      lines.push(
        `  ${arrayVarName}.add(JsonInt(Int64(${elementName})))`
      );
      break;
    case 'number':
      lines.push(`  ${arrayVarName}.add(JsonFloat(${elementName}))`);
      break;
    default:
      lines.push(`  ${arrayVarName}.add(JsonString(${elementName}.toString()))`);
      break;
  }
  lines.push('}');
  return {
    lines,
    needsJsonImport: true,
  };
}

/**
 * 根据返回类型生成 Promise Resolve 语句，支持 Option 与数组。
 */
function buildAsyncResolveLines(returnTypeInfo: ReturnTypeInfo) {
  const buildForValue = (valueName: string, info: ReturnTypeInfo) => {
    if (info.kind === 'void') {
      return { lines: ['PromiseResolve(promise)'], needsJsonImport: false };
    }
    if (info.kind === 'json') {
      return {
        lines: [`PromiseResolveJson(promise, ${valueName})`],
        needsJsonImport: false,
      };
    }
    if (info.kind === 'array' && info.arrayElementKind) {
      const arrayVarName = `${valueName}JsonArray`;
      const arrayInfo = buildArrayJsonLines(
        valueName,
        info.arrayElementKind,
        arrayVarName
      );
      return {
        lines: [...arrayInfo.lines, `PromiseResolve(promise, ${arrayVarName})`],
        needsJsonImport: arrayInfo.needsJsonImport,
      };
    }
    if (info.kind === 'unknown') {
      return { lines: ['PromiseResolve(promise)'], needsJsonImport: false };
    }
    return { lines: [`PromiseResolve(promise, ${valueName})`], needsJsonImport: false };
  };

  if (returnTypeInfo.isOptional) {
    const innerInfo = { ...returnTypeInfo, isOptional: false };
    const inner = buildForValue('value', innerInfo);
    return {
      lines: [
        `if (let Some(value) <- result) {`,
        ...inner.lines.map((line) => `  ${line}`),
        `} else {`,
        `  PromiseResolve(promise)`,
        `}`,
      ],
      needsJsonImport: inner.needsJsonImport,
    };
  }
  return buildForValue('result', returnTypeInfo);
}

/**
 * 构建同步返回 CJ_Object 的 Cangjie 代码片段。
 * 通过 CJ_ObjectKind 让 C++ 将 JSON 字符串还原为 JS 对象。
 */
function buildSyncReturnLines(
  returnTypeInfo: ReturnTypeInfo,
  resultName = 'result'
): SyncReturnInfo {
  if (returnTypeInfo.isOptional) {
    const inner: SyncReturnInfo = buildSyncReturnLines(
      { ...returnTypeInfo, isOptional: false },
      'value'
    );
    return {
      needsLibC: inner.needsLibC,
      needsJsonImport: inner.needsJsonImport,
      lines: [
        `if (let Some(value) <- ${resultName}) {`,
        ...inner.lines.map((line) => `  ${line}`),
        `}`,
        'return CJ_Object(CPointer<Unit>(), CJ_UndefinedKind)',
      ],
    };
  }

  switch (returnTypeInfo.kind) {
    case 'boolean':
      return {
        needsLibC: true,
        needsJsonImport: false,
        lines: [
          'let cBoolValue = unsafe { LibC.malloc<Bool>(count: 1) }',
          `cBoolValue.write(${resultName})`,
          'return CJ_Object(CPointer<Unit>(cBoolValue), CJ_BooleanKind)',
        ],
      };
    case 'int32':
      return {
        needsLibC: true,
        needsJsonImport: false,
        lines: [
          'let cIntValue = unsafe { LibC.malloc<Int32>(count: 1) }',
          `cIntValue.write(${resultName})`,
          'return CJ_Object(CPointer<Unit>(cIntValue), CJ_NumberKind)',
        ],
      };
    case 'number':
      return {
        needsLibC: true,
        needsJsonImport: false,
        lines: [
          'let cNumberValue = unsafe { LibC.malloc<Float64>(count: 1) }',
          `cNumberValue.write(${resultName})`,
          'return CJ_Object(CPointer<Unit>(cNumberValue), CJ_NumberKind)',
        ],
      };
    case 'string':
      return {
        needsLibC: true,
        needsJsonImport: false,
        lines: [
          `let cStringValue = unsafe { LibC.mallocCString(${resultName}).getChars() }`,
          'return CJ_Object(CPointer<Unit>(cStringValue), CJ_StringKind)',
        ],
      };
    case 'array': {
      if (returnTypeInfo.arrayElementKind) {
        const arrayVarName = `${resultName}JsonArray`;
        const arrayInfo = buildArrayJsonLines(
          resultName,
          returnTypeInfo.arrayElementKind,
          arrayVarName
        );
        return {
          needsLibC: true,
          needsJsonImport: arrayInfo.needsJsonImport,
          lines: [
            ...arrayInfo.lines,
            `let jsonString = ${arrayVarName}.toString()`,
            'let cJsonValue = unsafe { LibC.mallocCString(jsonString).getChars() }',
            'return CJ_Object(CPointer<Unit>(cJsonValue), CJ_ObjectKind)',
          ],
        };
      }
      return {
        needsLibC: false,
        needsJsonImport: false,
        lines: ['return CJ_Object(CPointer<Unit>(), CJ_UndefinedKind)'],
      };
    }
    case 'json':
      return {
        needsLibC: true,
        needsJsonImport: false,
        lines: [
          `let jsonString = ${resultName}.toString()`,
          'let cJsonValue = unsafe { LibC.mallocCString(jsonString).getChars() }',
          'return CJ_Object(CPointer<Unit>(cJsonValue), CJ_ObjectKind)',
        ],
      };
    default:
      return {
        needsLibC: false,
        needsJsonImport: false,
        lines: ['return CJ_Object(CPointer<Unit>(), CJ_UndefinedKind)'],
      };
  }
}

/**
 * Cangjie TurboModule CodeGen 主生成器。
 * 输出 C++ 包装层、C++/Cangjie 桥接层与 Cangjie 模板代码。
 */
export class CangjieTurboModuleCodeGenerator implements SpecCodeGenerator {
  constructor(
    private cppOutputPath: AbsolutePath,
    private cppBridgeOutputPath: AbsolutePath,
    private cangjieOutputPath: AbsolutePath,
    private cangjiePackagePrefix: string,
    private codegenNoticeLines: string[]
  ) {}

  /**
   * 基于 SpecSchema 生成多份代码文件内容。
   */
  generate(schema: SpecSchema): Map<AbsolutePath, string> {
    if (schema.type !== 'NativeModule') {
      throw new CodegenError({
        whatHappened: `CangjieTurboModuleCodeGenerator can't generate code for module type: ${schema.type}`,
        unexpected: true,
      });
    }

    const result = new Map<AbsolutePath, string>();
    const typeAnnotationToCangjie = new TypeAnnotationToCangjie(schema.aliasMap);
    const moduleName = schema.moduleName;
    const className = `${moduleName}TurboModule`;
    const bridgeNamespace = `${moduleName}Bridge`;
    const isEnabledName = `isCj${moduleName}Enabled`;
    const packageName = `${this.cangjiePackagePrefix}.${moduleName}`;
    const moduleDirPath = this.cangjieOutputPath.copyWithNewSegment(moduleName);
    const enumKindMap = new Map<string, ReturnKind>();

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
      enumKindMap.set(name, enumType === 'Int32' ? 'int32' : 'string');
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
      const returnTypeAnnotation = prop.typeAnnotation.returnTypeAnnotation;
      // 计算 JS 侧返回类型分支，用于同步/Promise 结果包装。
      const returnTypeInfo = getReturnTypeInfo(
        returnTypeAnnotation,
        schema.aliasMap,
        enumKindMap
      );
      const returnKind = returnTypeInfo.kind;
      const returnType = typeAnnotationToCangjie.convertReturnType(
        returnTypeAnnotation
      );
      const stringifiedArgs = prop.typeAnnotation.params
        .map((param) => {
          const isObjectParam = isJsonObjectTypeAnnotation(
            param.typeAnnotation,
            schema.aliasMap
          );
          const isArrayParam = isJsonArrayTypeAnnotation(
            param.typeAnnotation,
            schema.aliasMap
          );
          // Object/Array 类型需要映射为 JsonValue，便于业务侧直接获取结构化 JSON。
          const rawType =
            isObjectParam || isArrayParam
              ? 'JsonValue'
              : typeAnnotationToCangjie.convert(param.typeAnnotation);
          if (isObjectParam || isArrayParam) {
            cangjieTemplate.addImport('stdx.encoding.json.*');
          }
          // 可选参数在 Cangjie 侧用 ?Type 表示，提醒业务处理 None。
          const needsOptional =
            (param.optional ||
              param.typeAnnotation.type === 'NullableTypeAnnotation') &&
            !rawType.startsWith('?');
          const cangjieType = needsOptional ? `?${rawType}` : rawType;
          return `${param.name}: ${cangjieType}`;
        })
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
          index,
          param.optional
        );
        cppArgDeclarations.push(...cppArg.lines.map((line) => ({ line })));
        cppArgNames.push(cppArg.callArg);
      });

      const cppCallArgs = cppArgNames.join(', ');
      const cppCallArgsWithPromise = cppCallArgs.length
        ? `promiseHolder, ${cppCallArgs}`
        : 'promiseHolder';

      const hasSyncReturn = !returnsPromise && returnKind !== 'void';
      cppCppTemplate.addMethod({
        name: methodName,
        argsCount: prop.typeAnnotation.params.length,
        isAsync: returnsPromise,
        hasReturn: hasSyncReturn,
        cppArgDeclarations,
        cppCallArgs,
        cppCallArgsWithPromise,
      });

      const callbackTypeName = `${pascalName}Callback`;
      const callbackName = `${Case.camel(methodName)}Callback`;
      const registerFlagName = `${callbackName}Registered`;
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
        callbackReturnType: hasSyncReturn ? 'CJ_Object' : 'void',
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
        returnType: hasSyncReturn ? 'CJ_Object' : 'void',
        name: methodName,
        params: returnsPromise
          ? cppBridgeParamsWithPromise
          : cppBridgeParams,
      });

      cppBridgeCppTemplate.addCallback({
        callbackTypeName,
        callbackName,
        registerFlagName,
      });
      cppBridgeCppTemplate.addRegister({
        registerName: `register${pascalName}Callback`,
        callbackTypeName,
        callbackName,
        registerFlagName,
      });
      const callbackArgNames = prop.typeAnnotation.params.map((param) => param.name);
      const cppBridgeCallArgs = returnsPromise
        ? ['promiseHolder', ...callbackArgNames].join(', ')
        : callbackArgNames.join(', ');

      cppBridgeCppTemplate.addMethod({
        returnType: hasSyncReturn ? 'CJ_Object' : 'void',
        name: methodName,
        params: returnsPromise
          ? cppBridgeParamsWithPromise
          : cppBridgeParams,
        callArgs: cppBridgeCallArgs,
        callbackName,
        isAsync: returnsPromise,
        hasReturn: hasSyncReturn,
      });

      const cangjieFfiParams = prop.typeAnnotation.params.map((param) => ({
        name: param.name,
        ffiType: getCangjieFfiType(param.typeAnnotation),
        typeAnnotation: param.typeAnnotation,
      }));
      const cangjieParams = cangjieFfiParams
        .map((param) => `${param.name}: ${param.ffiType}`)
        .join(', ');
      const cangjieParamsWithPromise = cangjieParams.length
        ? `promise: PromiseHolder, ${cangjieParams}`
        : 'promise: PromiseHolder';

      const argConversions: { line: string }[] = [];
      const callArgs: string[] = [];
      let needsJsonStreamImport = false;
      let needsStdIoImport = false;
      let needsJsonImport = false;
      cangjieFfiParams.forEach((param) => {
        const conversion = buildCangjieArgConversion(
          param.name,
          param.ffiType,
          param.typeAnnotation,
          schema.aliasMap
        );
        argConversions.push(...conversion.lines.map((line) => ({ line })));
        callArgs.push(conversion.convertedName);
        needsJsonStreamImport =
          needsJsonStreamImport || conversion.needsJsonStreamImport;
        needsStdIoImport = needsStdIoImport || conversion.needsStdIoImport;
        needsJsonImport = needsJsonImport || conversion.needsJsonImport;
      });
      if (needsJsonStreamImport) {
        bridgeTemplate.addImport('stdx.encoding.json.stream.*');
      }
      if (needsStdIoImport) {
        bridgeTemplate.addImport('std.io.*');
      }
      if (needsJsonImport) {
        bridgeTemplate.addImport('stdx.encoding.json.*');
      }

      const callArgsString = callArgs.join(', ');
      const isVoidReturn = returnKind === 'void';
      const asyncCallLine = isVoidReturn
        ? `module.${methodName}(${callArgsString})`
        : `let result = module.${methodName}(${callArgsString})`;
      const asyncResolveInfo = buildAsyncResolveLines(returnTypeInfo);
      const syncCallLine = isVoidReturn
        ? `module.${methodName}(${callArgsString})`
        : '';
      const syncReturnInfo = hasSyncReturn
        ? buildSyncReturnLines(returnTypeInfo)
        : null;
      if (syncReturnInfo?.needsLibC) {
        bridgeTemplate.addImport('std.io.*');
      }
      if (syncReturnInfo?.needsJsonImport || asyncResolveInfo.needsJsonImport) {
        bridgeTemplate.addImport('stdx.encoding.json.*');
      }

      bridgeTemplate.addMethod({
        name: methodName,
        cFunctionName: `C${pascalName}`,
        stringifiedParams: returnsPromise
          ? cangjieParamsWithPromise
          : cangjieParams,
        callArgs: callArgsString,
        argConversions,
        isAsync: returnsPromise,
        hasReturn: hasSyncReturn,
        returnType: hasSyncReturn ? 'CJ_Object' : 'Unit',
        asyncCallLine,
        asyncResolveLines: asyncResolveInfo.lines.map((line: string) => ({
          line,
        })),
        syncCallLine,
        syncReturnLines: (syncReturnInfo?.lines ?? ([] as string[])).map(
          (line: string) => ({ line })
        ),
      });
      foreignTemplate.addMethod({
        registerName: `register${pascalName}Callback`,
        callbackSignature: returnsPromise
          ? ['PromiseHolder', ...cangjieFfiParams.map((p) => p.ffiType)].join(
              ', '
            )
          : cangjieFfiParams.map((p) => p.ffiType).join(', '),
        callbackReturnType: hasSyncReturn ? 'CJ_Object' : 'Unit',
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
