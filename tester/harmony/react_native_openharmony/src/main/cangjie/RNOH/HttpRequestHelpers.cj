/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RNOH

import ohos.net.http.*
import std.collection.*
import std.sync.*


public struct FetchOptions {
    let headers: ?HashMap<String, String>
    let usingCache: ?Bool

    public init(headers: ?HashMap<String, String>, usingCache: ?Bool) {
        this.headers = headers
        this.usingCache = usingCache
    }
}

public class FetchResult {
    public var headers: ?HashMap<String, String>  // Response headers.
    public var result: ?Array<Byte>  // Response body.
    public var responseCode: ?UInt32

    public init(headers: ?HashMap<String, String>, result: ?Array<Byte>, responseCode: ?UInt32) {
        this.headers = headers
        this.result = result
        this.responseCode = responseCode
    }

    public init() {
        headers = None
        result = None
        responseCode = None
    }

    public prop resolved: Bool {
        get() {
            return headers.isSome() && result.isSome() && responseCode.isSome()
        }
    }
}

public func fetchDataFromUrl(url: String, options!: FetchOptions = FetchOptions(None, true)): FetchResult {
    let httpRequest = createHttp()
    let dataChunks = ArrayList<Byte>()
    let result = FetchResult()
    // Use semaphore to block the task until the httpRequest is completed(all data is received).
    let semp = Semaphore(1)
    semp.acquire(amount: 1)

    func cleanUp(): Unit {
        httpRequest.destroy()
    }

    func maybeResolve(): Unit {
        if (result.resolved) {
            semp.release(amount: 1)
            cleanUp()
        }
    }

    httpRequest.onHeadersReceive({ data =>
        result.headers = data
        maybeResolve()
    })

    httpRequest.onDataReceive({ data =>
        dataChunks.add(all: data)
    })

    httpRequest.onDataEnd({ =>
        result.result = unsafe {
            dataChunks.getRawArray()[0..dataChunks.size]
        }
        maybeResolve()
    })

    try {
        httpRequest.requestInStream(url, { err, code =>
            result.responseCode = code
            if (err.isSome()) {
                cleanUp()
            } else {
                maybeResolve()
            }
        }, options: HttpRequestOptions(
            header: options.headers,
            usingCache: options.usingCache.getOrThrow()
        ))
    } catch (err: Exception) {
        throw err
    }
    // 等待执行结果
    semp.acquire(amount: 1)

    return result
}
