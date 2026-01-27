/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RNOHCorePackage.turboModules.ImageLoader

import reactnative_ohcj.RemoteImageLoader.*
import std.collection.HashMap
import ohos.image.ImageInfo


var turboModule: ?ImageLoaderTurboModule = None

public class ImageLoaderTurboModule {
    private let imageLoader: RemoteImageLoader

    public init() {
        imageLoader = RemoteImageLoader(
            RemoteImageDiskCache(128, ctx.getOrThrow().cacheDir),
            ctx.getOrThrow()
        )
    }

    public func getSize(uri: String): (Int32, Int32) {
        let imageSource = this.imageLoader.getImageSource(uri)
        let imageInfo = imageSource.getImageSource().getImageInfo()
        return (imageInfo.size.width, imageInfo.size.height)
    }

    public func getSizeWithHeaders(uri: String, headers: HashMap<String, String>): (Int32, Int32) {
        let destHeaders = HashMap<String, String>()

        if(headers["crossOrigin"] == "use-credentials") {
            destHeaders['Access-Control-Allow-Credentials'] = 'true'
        }

        if(let Some(policy) <- headers.get("referrerPolicy")) {
            destHeaders["Referrer-Policy"] = policy
        }

        let imageSource = this.imageLoader.getImageSource(uri, headers: destHeaders)
        let imageInfo = imageSource.getImageSource().getImageInfo()
        return (imageInfo.size.width, imageInfo.size.height)
    }

    public func prefetchImage(rnInstanceId: UInt64, uri: String, requestId!: Int64 = 0): Bool {
        return this.imageLoader.prefetch(rnInstanceId, uri, requestId)
    }

    public func queryCache(uris: Array<String>): HashMap<String, ?String> {
        let result = HashMap<String, ?String>()
        for(uri in uris) {
            result[uri] = this.imageLoader.queryCache(uri)
        }
        return result
    }

    public func getPrefetchResult(uri: String): String {
        return this.imageLoader.getPrefetchResult(uri)
    }

    public func abortPrefetch(requestId: Int64): Unit {
        this.imageLoader.abortPrefetch(requestId)
    }
}