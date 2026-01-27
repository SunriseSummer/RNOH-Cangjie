/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */

package reactnative_ohcj.RemoteImageLoader

import ohos.file_fs.FileFs
import std.regex.Regex
import std.fs.Directory


let EMPTY_CACHE_KEY: String = ""

public class RemoteImageDiskCache <: RemoteImageCache<Bool> {
    private let cacheDir: String  // The directory to store the downloaded images
    
    public init(maxSize: Int64, cacheDir: String) {
        super(maxSize)
        this.cacheDir = cacheDir

        // Walk the cache directory and add the file info to the cache
        Directory.walk(cacheDir, { info =>
            this.data.add(info.name.replace("//", ""), true)
            true
        })
    }

    public func remove(key: String): Unit {
        let cachedKey = this.getCacheKey(key)
        if (this.data.contains(cachedKey)) {
            // Delete the file from the cache directory
            FileFs.unlink(cachedKey)
            this.data.remove(cachedKey)
        }
    }

    public func clear(): Unit {
        this.data.removeIf({ key, _ =>
            let cachedKey = this.getCacheKey(key)
            FileFs.unlink(cachedKey)
            true
        })
    }

    public func set(key: String, value: Bool): Unit {
        let cachedKey = this.getCacheKey(key)
        if (cachedKey.isEmpty()) {
            return
        }
        return super.set(cachedKey, value)
    }

    public func has(key: String): Bool {
        let cachedKey = this.getCacheKey(key)
        if (super.has(cachedKey)) {
            try {
                // Check if the file exists
                return FileFs.stat(this.getFilePath(cachedKey)).isFile()
            } catch (e: Exception) { }
        }
        return false
    }

    // "getLocation" does not check if the file exists and is also used to obtain the file path for prefetch
    public func getLocation(key: String): String {
        let cachedKey = this.getCacheKey(key)
        return this.getFilePath(cachedKey)
    }

    private func getFilePath(key: String): String {
        return this.cacheDir + "/" + key
    }

    private func getCacheKey(uri: String): String {
        let reg = Regex("[^a-zA-Z0-9 -]")
        return reg.replaceAll(uri, "")
    }
}

