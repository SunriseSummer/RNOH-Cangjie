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

type PromiseHolder = CPointer<Unit>

foreign {
  {{#methods}}
  func {{registerName}}(callback: CFunc<({{{callbackSignature}}}) -> Unit>): Unit
  {{/methods}}
}
`;

type Method = {
  registerName: string;
  callbackSignature: string;
};

export class CangjieForeignTemplate {
  private methods: Method[] = [];

  constructor(private packageName: string, private codegenNoticeLines: string[]) {}

  addMethod(method: Method) {
    this.methods.push(method);
  }

  build(): string {
    return mustache.render(TEMPLATE.trimStart(), {
      packageName: this.packageName,
      codegenNoticeLines: this.codegenNoticeLines.map((line) => ({ line })),
      methods: this.methods,
    });
  }
}
