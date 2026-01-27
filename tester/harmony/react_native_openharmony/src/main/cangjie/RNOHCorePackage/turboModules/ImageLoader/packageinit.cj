/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RNOHCorePackage.turboModules.ImageLoader

import reactnative_ohcj.RNOH.RNOHContext


var ctx: ?RNOHContext = None

public func packageInit(context: RNOHContext): Unit {
    ctx = context
    turboModule = ImageLoaderTurboModule()
    unsafe {
        registerGetSizeCallback(CGetSize)
        registerGetSizeWithHeadersCallback(CGetSizeWithHeaders)
        registerPrefetchImageCallback(CPrefetchImage)
        registerAbortPrefetchCallback(CAbortPrefetch)
        registerQueryCacheCallback(CQueryCache)
        registerGetPrefetchResultCallback(CGetPrefetchResult)
    }
}
