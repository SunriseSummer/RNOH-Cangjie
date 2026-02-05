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

#pragma once

#include "RNOH/TurboModule.h"

namespace rnoh {

class JSI_EXPORT {{className}} : public TurboModule {
 public:
  {{className}}(const TurboModule::Context ctx, const std::string name);

  {{#methods}}
  static facebook::jsi::Value {{name}}(
      facebook::jsi::Runtime& rt,
      facebook::react::TurboModule& turboModule,
      const facebook::jsi::Value* args,
      size_t count);
  {{/methods}}
};

} // namespace rnoh
`;

type Method = {
  name: string;
};

export class CppTurboModuleHTemplate {
  private methods: Method[] = [];

  constructor(private className: string, private codegenNoticeLines: string[]) {}

  addMethod(method: Method) {
    this.methods.push(method);
  }

  build(): string {
    return mustache.render(TEMPLATE.trimStart(), {
      className: this.className,
      codegenNoticeLines: this.codegenNoticeLines.map((line) => ({ line })),
      methods: this.methods,
    });
  }
}
