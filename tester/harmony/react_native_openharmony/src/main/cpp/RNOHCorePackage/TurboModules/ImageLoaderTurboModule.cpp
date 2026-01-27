/**
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

#include "ImageLoaderTurboModule.h"
#include "RNOH/ArkTSTurboModule.h"

#include "RNOHCangjieBridge/TurboModuleBridge/ImageLoaderBridge.h"
#include "RNOHCangjieBridge/PromiseHolder.h"

#include <memory>
#include "react/bridging/Promise.h"
#include "react/bridging/Bool.h"

using namespace rnoh;
using namespace facebook;

// Initialize ImageLoaderTurboModule with context and name
rnoh::ImageLoaderTurboModule::ImageLoaderTurboModule(
    const ArkTSTurboModule::Context ctx,
    const std::string name)
    : rnoh::ArkTSTurboModule(ctx, name) {
methodMap_ = {
     { "getConstants", { 0, ImageLoaderTurboModule::getConstants } },
     { "getCacheFilePath", { 1, ImageLoaderTurboModule::getCacheFilePath } },
     { "getSize", { 1, ImageLoaderTurboModule::getSize } },
     { "getSizeWithHeaders", { 2, ImageLoaderTurboModule::getSizeWithHeaders } },
     { "prefetchImage", { 2, ImageLoaderTurboModule::prefetchImage } },
     { "abortPrefetch", { 1, ImageLoaderTurboModule::abortPrefetch } },
     { "prefetchImageWithMetadata", { 3, ImageLoaderTurboModule::prefetchImageWithMetadata } },
     { "queryCache", { 1, ImageLoaderTurboModule::queryCache } }
};
}

// Get module constants for image loading configuration
facebook::jsi::Value ImageLoaderTurboModule::getConstants(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    return facebook::jsi::Object(rt);
}

// Get file path for cached image
facebook::jsi::Value ImageLoaderTurboModule::getCacheFilePath(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    return jsi::Value::undefined();
}

// Get image dimensions (width and height) for given URL
facebook::jsi::Value ImageLoaderTurboModule::getSize(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    if(!ImageLoaderBridge::isCjImageLoaderEnabled()) {
         return static_cast<ArkTSTurboModule&>(turboModule).callAsync(rt, "getSize", args, count);
    }
    if (count < 1 || !args[0].isString()) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, "getSize: uri must be a string"));
    }
    
    try {
        auto uri = args[0].asString(rt).utf8(rt);
        const auto callInvoker = dynamic_cast<ImageLoaderTurboModule *>(&turboModule)->jsInvoker_;
        auto asyncPromise = std::make_shared<react::AsyncPromise<CJ_Object>>(rt, callInvoker);
        auto promiseHolder = new PromiseHolder<CJ_Object>(asyncPromise);
        ImageLoaderBridge::getSize((void *)promiseHolder, uri.c_str());

        return asyncPromise->get(rt);
    } catch (const std::exception& e) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, e.what()));
    }
}

// Get image dimensions with custom HTTP headers
facebook::jsi::Value ImageLoaderTurboModule::getSizeWithHeaders(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    if(!ImageLoaderBridge::isCjImageLoaderEnabled()) {
         return static_cast<ArkTSTurboModule&>(turboModule).callAsync(rt, "getSizeWithHeaders", args, count);
    }
    if (count < 1 || !args[0].isString()) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, "getSizeWithHeaders: uri must be a string"));
    }
    
    try {
        auto uri = args[0].asString(rt).utf8(rt);
        
        std::string headersJson = "{}";
        if (count > 1 && args[1].isObject()) {
            auto jsonObj = rt.global().getPropertyAsObject(rt, "JSON");
            auto stringify = jsonObj.getPropertyAsFunction(rt, "stringify");
            auto jsonString = stringify.call(rt, args[1]);
            if (jsonString.isString()) {
                headersJson = jsonString.asString(rt).utf8(rt);
            }
        }
        
        const auto callInvoker = dynamic_cast<ImageLoaderTurboModule *>(&turboModule)->jsInvoker_;
        auto asyncPromise = std::make_shared<react::AsyncPromise<CJ_Object>>(rt, callInvoker);
        auto promiseHolder = new PromiseHolder<CJ_Object>(asyncPromise);
        ImageLoaderBridge::getSizeWithHeaders((void *)promiseHolder, uri.c_str(), headersJson.c_str());
        
        return asyncPromise->get(rt);
    } catch (const std::exception& e) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, e.what()));
    }
}

// Prefetch image to cache for future use
facebook::jsi::Value ImageLoaderTurboModule::prefetchImage(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    if(!ImageLoaderBridge::isCjImageLoaderEnabled()) {
         return static_cast<ArkTSTurboModule&>(turboModule).callAsync(rt, "prefetchImage", args, count);
    }
    
    const auto callInvoker = dynamic_cast<ImageLoaderTurboModule *>(&turboModule)->jsInvoker_;
    auto asyncPromise = std::make_shared<react::AsyncPromise<CJ_Object>>(rt, callInvoker);
    auto promiseHolder = new PromiseHolder<CJ_Object>(asyncPromise);
    auto uri = args[0].asString(rt).utf8(rt);
    auto rnInstanceId = dynamic_cast<ImageLoaderTurboModule *>(&turboModule)->m_ctx.instance.lock()->getId();

    uint64_t requestId = 0;
    if (count > 1 && args[1].isNumber()) {
        requestId = static_cast<uint64_t>(args[1].asNumber());
    }
    ImageLoaderBridge::prefetchImage((void *)promiseHolder, (unsigned long)rnInstanceId, uri.c_str(), requestId);

    return asyncPromise->get(rt);
}

// Abort ongoing prefetch operation
facebook::jsi::Value ImageLoaderTurboModule::abortPrefetch(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    if(!ImageLoaderBridge::isCjImageLoaderEnabled()) {
         return static_cast<ArkTSTurboModule&>(turboModule).callAsync(rt, "abortPrefetch", args, count);
    }
    if (count < 1 || !args[0].isNumber()) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, "abortPrefetch: requestId must be a number"));
    }
    
    try {
        auto requestId = static_cast<long long>(args[0].asNumber());
        const auto callInvoker = dynamic_cast<ImageLoaderTurboModule *>(&turboModule)->jsInvoker_;
        auto asyncPromise = std::make_shared<react::AsyncPromise<CJ_Object>>(rt, callInvoker);
        auto promiseHolder = new PromiseHolder<CJ_Object>(asyncPromise);
        ImageLoaderBridge::abortPrefetch((void *)promiseHolder, requestId);
        
        return asyncPromise->get(rt);
    } catch (const std::exception& e) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, e.what()));
    }
}

// Prefetch image with metadata information
facebook::jsi::Value ImageLoaderTurboModule::prefetchImageWithMetadata(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    if(!ImageLoaderBridge::isCjImageLoaderEnabled()) {
         return static_cast<ArkTSTurboModule&>(turboModule).callAsync(rt, "prefetchImageWithMetadata", args, count);
    }
    auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
    auto resolve = promise.getPropertyAsFunction(rt, "resolve");
    return resolve.call(rt, jsi::Value(rt, false));
}

// Query cache status for given image URLs
facebook::jsi::Value ImageLoaderTurboModule::queryCache(facebook::jsi::Runtime& rt, facebook::react::TurboModule& turboModule, const facebook::jsi::Value* args, size_t count) {
    if(!ImageLoaderBridge::isCjImageLoaderEnabled()) {
         return static_cast<ArkTSTurboModule&>(turboModule).callAsync(rt, "queryCache", args, count);
    }
    if (count < 1 || !args[0].asObject(rt).isArray(rt)) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, "queryCache: uris must be an array"));
    }
    
    try {
        auto urisArray = args[0].asObject(rt).asArray(rt);
        std::vector<std::string> uris;
        
        for (size_t i = 0; i < urisArray.size(rt); i++) {
            auto uriValue = urisArray.getValueAtIndex(rt, i);
            if (uriValue.isString()) {
                uris.push_back(uriValue.asString(rt).utf8(rt));
            }
        }
        
        const auto callInvoker = dynamic_cast<ImageLoaderTurboModule *>(&turboModule)->jsInvoker_;
        auto asyncPromise = std::make_shared<react::AsyncPromise<CJ_Object>>(rt, callInvoker);
        auto promiseHolder = new PromiseHolder<CJ_Object>(asyncPromise);
        
        std::string urisStr = "[";
        for (size_t i = 0; i < uris.size(); i++) {
            if (i > 0) urisStr += ",";
            urisStr += '"' + uris[i] + '"';
        }
        urisStr += "]";
        
        ImageLoaderBridge::queryCache((void *)promiseHolder, urisStr.c_str());
        
        return asyncPromise->get(rt);
    } catch (const std::exception& e) {
        auto promise = rt.global().getPropertyAsFunction(rt, "Promise");
        auto reject = promise.getPropertyAsFunction(rt, "reject");
        return reject.call(rt, jsi::String::createFromUtf8(rt, e.what()));
    }
}

