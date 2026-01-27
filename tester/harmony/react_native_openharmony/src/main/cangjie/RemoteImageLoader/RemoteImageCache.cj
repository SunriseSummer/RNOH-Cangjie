/*
 * Copyright (c) 2024 Huawei Technologies Co., Ltd.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE-MIT file in the root directory of this source tree.
 */
 
package reactnative_ohcj.RemoteImageLoader

import std.sync.ReadWriteLock


public open class RemoteImageCache<T> {
    protected let data: TinyLinkedHashMap<String, T>  // Store the cache data in a linked hash map
    protected let maxSize: Int64
    // ReadWriteLock for thread safety, to avoid data inconsistency when multiple threads access the cache
    protected let readWriteLock = ReadWriteLock()

    public init(maxSize: Int64) {
        this.data = TinyLinkedHashMap<String, T>(maxSize)
        this.maxSize = maxSize
    }

    public open func set(key: String, value: T): Unit {
        // Ensure thread safety when adding data to the cache
        synchronized(readWriteLock.writeLock) {
            this.data.add(key, value)
            // Check if cache size exceeds the maximum size, and if so, remove the oldest entry
            if (this.data.size > this.maxSize) {
                data.removeFirst()
            }
        }
    }

    public open func get(key: String): ?T {
        synchronized(readWriteLock.readLock) {
            return this.data.get(key)
        }
    }

    public open func has(key: String): Bool {
        synchronized(readWriteLock.readLock) {
            return this.data.contains(key)
        }
    }

    public open func remove(key: String): Unit {
        synchronized(readWriteLock.writeLock) {
            this.data.remove(key)
        }
    }

    public open func clear(): Unit {
        synchronized(readWriteLock.writeLock) {
            this.data.clear()
        }
    }

    public open func size(): Int64 {
        synchronized(readWriteLock.readLock) {
            return this.data.size
        }
    }
}
