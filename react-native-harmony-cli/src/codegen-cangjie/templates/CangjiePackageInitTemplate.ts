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

import reactnative_ohcj.RNOH.RNOHContext

var ctx: ?RNOHContext = None

public func packageInit(context: RNOHContext): Unit {
  ctx = context
  turboModule = {{className}}()
  unsafe {
    {{#methods}}
    {{registerName}}({{cFunctionName}})
    {{/methods}}
  }
}
`;

type Method = {
  registerName: string;
  cFunctionName: string;
};

export class CangjiePackageInitTemplate {
  private methods: Method[] = [];

  constructor(
    private className: string,
    private packageName: string,
    private codegenNoticeLines: string[]
  ) {}

  addMethod(method: Method) {
    this.methods.push(method);
  }

  build(): string {
    return mustache.render(TEMPLATE.trimStart(), {
      className: this.className,
      packageName: this.packageName,
      codegenNoticeLines: this.codegenNoticeLines.map((line) => ({ line })),
      methods: this.methods,
    });
  }
}
