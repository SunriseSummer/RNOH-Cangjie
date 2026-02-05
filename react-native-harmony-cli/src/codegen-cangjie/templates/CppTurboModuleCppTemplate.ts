/**
 * Copyright (c) 2025 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

import mustache from 'mustache';

const TEMPLATE = `
/**
{{#codegenNoticeLines}}
 * {{{line}}}
{{/codegenNoticeLines}}
 */

#include "{{className}}.h"
#include "RNOHCangjieBridge/PromiseHolder.h"
#include "RNOHCangjieBridge/TurboModuleBridge/{{bridgeHeader}}"
#include "react/bridging/Promise.h"

#include <memory>

using namespace rnoh;
using namespace facebook;

{{className}}::{{className}}(const TurboModule::Context ctx, const std::string name)
    : TurboModule(ctx, name) {
  methodMap_ = {
    {{#methods}}
    { "{{name}}", { {{argsCount}}, {{className}}::{{name}} } },
    {{/methods}}
  };
}

{{#methods}}
facebook::jsi::Value {{className}}::{{name}}(
    facebook::jsi::Runtime& rt,
    facebook::react::TurboModule& turboModule,
    const facebook::jsi::Value* args,
    size_t count) {
  {{#cppArgDeclarations}}
  {{{line}}}
  {{/cppArgDeclarations}}
  {{#isAsync}}
  const auto callInvoker =
      dynamic_cast<{{className}}*>(&turboModule)->jsInvoker_;
  auto asyncPromise =
      std::make_shared<react::AsyncPromise<CJ_Object>>(rt, callInvoker);
  auto promiseHolder = new PromiseHolder<CJ_Object>(asyncPromise);
  {{bridgeNamespace}}::{{name}}({{{cppCallArgsWithPromise}}});
  return asyncPromise->get(rt);
  {{/isAsync}}
  {{^isAsync}}
  {{bridgeNamespace}}::{{name}}({{{cppCallArgs}}});
  return jsi::Value::undefined();
  {{/isAsync}}
}

{{/methods}}
`;

type Method = {
  name: string;
  argsCount: number;
  isAsync: boolean;
  cppArgDeclarations: { line: string }[];
  cppCallArgs: string;
  cppCallArgsWithPromise: string;
};

export class CppTurboModuleCppTemplate {
  private methods: Method[] = [];

  constructor(
    private className: string,
    private bridgeHeader: string,
    private bridgeNamespace: string,
    private codegenNoticeLines: string[]
  ) {}

  addMethod(method: Method) {
    this.methods.push(method);
  }

  build(): string {
    return mustache.render(TEMPLATE.trimStart(), {
      className: this.className,
      bridgeHeader: this.bridgeHeader,
      bridgeNamespace: this.bridgeNamespace,
      codegenNoticeLines: this.codegenNoticeLines.map((line) => ({ line })),
      methods: this.methods,
    });
  }
}
