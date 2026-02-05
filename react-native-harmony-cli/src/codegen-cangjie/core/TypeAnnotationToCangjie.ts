/**
 * Copyright (c) 2025 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import { TypeAnnotation } from '../../codegen/core/TypeAnnotationToTS';

export class TypeAnnotationToCangjie {
  convert(typeAnnotation: TypeAnnotation | undefined): string {
    if (!typeAnnotation) {
      return 'String';
    }
    switch (typeAnnotation.type) {
      case 'BooleanTypeAnnotation':
        return 'Bool';
      case 'StringTypeAnnotation':
        return 'String';
      case 'Int32TypeAnnotation':
        return 'Int32';
      case 'DoubleTypeAnnotation':
      case 'FloatTypeAnnotation':
      case 'NumberTypeAnnotation':
        // Default to Int32 to align with existing PromiseResolve overloads.
        return 'Int32';
      case 'StringEnumTypeAnnotation':
        return 'String';
      case 'Int32EnumTypeAnnotation':
        return 'Int32';
      case 'EnumDeclaration':
        return typeAnnotation.name;
      case 'NullableTypeAnnotation':
        return `?${this.convert(typeAnnotation.typeAnnotation)}`;
      case 'ArrayTypeAnnotation':
        return `Array<${this.convert(typeAnnotation.elementType)}>`;
      case 'TypeAliasTypeAnnotation':
        return typeAnnotation.name;
      case 'ReservedTypeAnnotation':
        if (typeAnnotation.name === 'RootTag') {
          return 'Int32';
        }
        return 'String';
      case 'ReservedPropTypeAnnotation':
      case 'ObjectTypeAnnotation':
      case 'UnionTypeAnnotation':
      case 'GenericObjectTypeAnnotation':
      case 'MixedTypeAnnotation':
      case 'FunctionTypeAnnotation':
        return 'String';
      case 'PromiseTypeAnnotation':
        return this.convert(typeAnnotation.elementType);
      case 'VoidTypeAnnotation':
        return 'Unit';
      default:
        return 'String';
    }
  }

  convertReturnType(typeAnnotation: TypeAnnotation | undefined): string {
    if (!typeAnnotation) {
      return 'Unit';
    }
    if (typeAnnotation.type === 'PromiseTypeAnnotation') {
      return this.convert(typeAnnotation.elementType);
    }
    if (typeAnnotation.type === 'VoidTypeAnnotation') {
      return 'Unit';
    }
    return this.convert(typeAnnotation);
  }
}
