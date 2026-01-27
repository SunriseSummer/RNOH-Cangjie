/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RNOHCorePackage.turboModules.ImageLoader

import std.io.*
import std.collection.HashMap
import stdx.encoding.json.stream.*
import reactnative_ohcj.Bridge.*
import stdx.encoding.json.{JsonObject, JsonInt, JsonArray}


@C
func CGetSize(promise: PromiseHolder, uri: CString): Unit {
    // Uri is a CString, which means it may be garbage collected sometime before the code within spawn is executed.
    // So we copy it and store in a Cangjie variable to avoid this issue.
    let cjUri = uri.toString()
    if (let Some(module) <- turboModule) {
        spawn {
            try {
                let result = module.getSize(cjUri)
                let resultArray = JsonArray()
                resultArray.add(JsonInt(Int64(result[0])))
                resultArray.add(JsonInt(Int64(result[1])))
                PromiseResolve(promise, resultArray)
            } catch (e: Exception) {
                PromiseReject(promise, e.toString())
            }
        }
    }
}

@C
func CGetSizeWithHeaders(promise: PromiseHolder, uri: CString, headers: CString): Unit {
    let cjUri = uri.toString()
    let cjHeaders = headers.toString()
    if (let Some(module) <- turboModule) {
        spawn {
            try {
                let headerMap = HashMap<String, String>.fromJson(JsonReader(ByteBuffer(unsafe { cjHeaders.rawData() })))
                let result = module.getSizeWithHeaders(cjUri, headerMap)
                let resultJson = JsonObject()
                resultJson.put("width", JsonInt(Int64(result[0])))
                resultJson.put("height", JsonInt(Int64(result[1])))
                PromiseResolve(promise, resultJson)
            } catch (e: Exception) {
                PromiseReject(promise, e.toString())
            }
        }
    }
}

@C
func CPrefetchImage(promise: PromiseHolder, rnInstanceId: UInt64, uri: CString, requestid: Int64): Unit {
    let cjUri = uri.toString()
    spawn {
        if (let Some(module) <- turboModule) {
            try {
                let result = module.prefetchImage(rnInstanceId, cjUri, requestId: requestid)
                PromiseResolve(promise, result)
            } catch (e: Exception) {
                PromiseReject(promise, e.toString())
            }
        }
    }
}

@C
func CAbortPrefetch(promise: PromiseHolder, requestId: Int64): Unit {
    if (let Some(module) <- turboModule) {
        spawn {
            try {
                module.abortPrefetch(requestId)
                PromiseResolve(promise, true)
            } catch (e: Exception) {
                PromiseReject(promise, e.toString())
            }
        }
    }
}

// uris: JSON string array.
@C
func CQueryCache(promise: PromiseHolder, uri: CString): Unit {
    let cjUri = uri.toString()
    spawn {
        if (let Some(module) <- turboModule) {
            try {
                let result = module.queryCache(cjUri)
                PromiseResolve(promise, result)
            } catch (e: Exception) {
                PromiseReject(promise, e.toString())
            }
        }
    }
}

@C
func CGetPrefetchResult(uri: CString): CString {
    let cjUri = uri.toString()
    var cacheUri = ""
    if (let Some(module) <- turboModule) {
        try {
            cacheUri = module.getPrefetchResult(cjUri)
        } catch (e:Exception) { }
    }
    let cCacheUri = unsafe { LibC.mallocCString(cacheUri) }
    return cCacheUri
}