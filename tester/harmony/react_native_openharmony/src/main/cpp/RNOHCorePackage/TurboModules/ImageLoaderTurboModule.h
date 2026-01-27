/**
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

#pragma once

#include "RNOH/ArkTSTurboModule.h"

namespace rnoh {

class JSI_EXPORT ImageLoaderTurboModule : public ArkTSTurboModule {
public:
    ImageLoaderTurboModule(
        const ArkTSTurboModule::Context ctx,
        const std::string name);
    
    // Method declarations
    static facebook::jsi::Value getConstants(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
    static facebook::jsi::Value getCacheFilePath(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
    static facebook::jsi::Value getSize(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
    static facebook::jsi::Value getSizeWithHeaders(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
    static facebook::jsi::Value prefetchImage(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
    static facebook::jsi::Value abortPrefetch(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
    static facebook::jsi::Value prefetchImageWithMetadata(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
    static facebook::jsi::Value queryCache(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count);
};

} // namespace rnoh