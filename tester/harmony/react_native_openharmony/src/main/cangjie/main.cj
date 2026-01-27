/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj

import ohos.ark_interop.{JSModule, JSContext, JSCallInfo, JSValue}
import reactnative_ohcj.RNOHCorePackage.turboModules.ImageLoader
import kit.AbilityKit.*
import ohos.ark_interop_helper.*
import reactnative_ohcj.RNOH.RNOHContext


func initGlobalFuncs(runtime: JSContext, callInfo: JSCallInfo): JSValue {
    let abilityContext = createAbilityContextFromJSValue(runtime, callInfo[0])
    let jsEnv = runtime.getNapiEnv()
    let jsValue = arkTsValuetoNapiValue(jsEnv, callInfo[0])
    
    let stageContext = getStageContext(abilityContext)
    if(stageContext.isNull()) {
        throw Exception("getContextStageMode null")
    }
    
    let cachedir = callInfo[1].asString().toString()
    let ctx = RNOHContext(stageContext: stageContext, uiAbilityContext: abilityContext, cacheDir: cachedir)
    // 在此调用用到的包的初始化函数
    ImageLoader.packageInit(ctx)

    return runtime.undefined().toJSValue()
}

let EXPORT_MODULE = JSModule.registerModule {
    runtime, exports => exports["initGlobalFuncs"] = runtime.function(initGlobalFuncs).toJSValue()
}
