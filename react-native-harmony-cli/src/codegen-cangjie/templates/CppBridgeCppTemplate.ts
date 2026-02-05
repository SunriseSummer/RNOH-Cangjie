/**
 * Copyright (c) 2025 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import mustache from 'mustache';

const TEMPLATE = `
/*
{{#codegenNoticeLines}}
 * {{{line}}}
{{/codegenNoticeLines}}
 */

#include "{{headerName}}"

static bool g_isRegistered = false;

{{#callbacks}}
static {{callbackTypeName}} g_{{callbackName}} = nullptr;
{{/callbacks}}

extern "C" {
  {{#registers}}
  void {{registerName}}({{callbackTypeName}} callback) {
    g_{{callbackName}} = callback;
    g_isRegistered = true;
  }
  {{/registers}}
}

namespace {{bridgeNamespace}} {
  bool {{isEnabledName}}() {
    return g_isRegistered;
  }

  {{#methods}}
  {{returnType}} {{name}}({{{params}}}) {
    if (g_{{callbackName}}) {
      {{#hasReturn}}
      return g_{{callbackName}}({{{callArgs}}});
      {{/hasReturn}}
      {{^hasReturn}}
      g_{{callbackName}}({{{callArgs}}});
      {{/hasReturn}}
    {{#isAsync}}
    } else if (promiseHolder) {
      CJ_PromiseReject(promiseHolder, "{{name}} callback not registered");
    }
    {{/isAsync}}
    {{^isAsync}}
    }
    {{/isAsync}}
    {{#hasReturn}}
    return CJ_Object{nullptr, CJ_UndefinedKind};
    {{/hasReturn}}
  }

  {{/methods}}
}
`;

type Callback = {
  callbackTypeName: string;
  callbackName: string;
};

type Register = {
  registerName: string;
  callbackTypeName: string;
  callbackName: string;
};

type Method = {
  returnType: string;
  name: string;
  params: string;
  callArgs: string;
  callbackName: string;
  isAsync: boolean;
  hasReturn: boolean;
};

export class CppBridgeCppTemplate {
  private callbacks: Callback[] = [];
  private registers: Register[] = [];
  private methods: Method[] = [];

  constructor(
    private headerName: string,
    private bridgeNamespace: string,
    private isEnabledName: string,
    private codegenNoticeLines: string[]
  ) {}

  addCallback(callback: Callback) {
    this.callbacks.push(callback);
  }

  addRegister(register: Register) {
    this.registers.push(register);
  }

  addMethod(method: Method) {
    this.methods.push(method);
  }

  build(): string {
    return mustache.render(TEMPLATE.trimStart(), {
      headerName: this.headerName,
      bridgeNamespace: this.bridgeNamespace,
      isEnabledName: this.isEnabledName,
      codegenNoticeLines: this.codegenNoticeLines.map((line) => ({ line })),
      callbacks: this.callbacks,
      registers: this.registers,
      methods: this.methods,
    });
  }
}
