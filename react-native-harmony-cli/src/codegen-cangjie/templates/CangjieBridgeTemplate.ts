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

package {{packageName}}

import reactnative_ohcj.Bridge.*

{{#imports}}
import {{{name}}}
{{/imports}}

{{#methods}}
@C
func {{cFunctionName}}({{{stringifiedParams}}}): Unit {
  {{#argConversions}}
  {{{line}}}
  {{/argConversions}}
  if (let Some(module) <- turboModule) {
    {{#isAsync}}
    spawn {
      try {
        {{{asyncCallLine}}}
        {{{asyncResolveLine}}}
      } catch (e: Exception) {
        PromiseReject(promise, "{{name}} failed: " + e.toString())
      }
    }
    {{/isAsync}}
    {{^isAsync}}
    try {
      {{syncCallLine}}
    } catch (e: Exception) { }
    {{/isAsync}}
  }
}

{{/methods}}
`;

type ImportModel = {
  name: string;
};

type Method = {
  name: string;
  cFunctionName: string;
  stringifiedParams: string;
  callArgs: string;
  argConversions: { line: string }[];
  isAsync: boolean;
  asyncCallLine: string;
  asyncResolveLine: string;
  syncCallLine: string;
};

export class CangjieBridgeTemplate {
  private methods: Method[] = [];
  private imports: ImportModel[] = [];

  constructor(private packageName: string, private codegenNoticeLines: string[]) {}

  addMethod(method: Method) {
    this.methods.push(method);
  }

  addImport(importName: string) {
    if (!this.imports.find((item) => item.name === importName)) {
      this.imports.push({ name: importName });
    }
  }

  build(): string {
    return mustache.render(TEMPLATE.trimStart(), {
      packageName: this.packageName,
      codegenNoticeLines: this.codegenNoticeLines.map((line) => ({ line })),
      methods: this.methods,
      imports: this.imports,
    });
  }
}
